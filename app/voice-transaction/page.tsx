'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mic,
  MicOff,
  X,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  ChevronLeft,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import NeoSelect from '@/components/NeoSelect'
import DatePickerNeo from '@/components/DatePickerNeo'
import { Wallet, CATEGORIES } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────
interface ParsedTransaction {
  type: 'pemasukan' | 'pengeluaran' | 'topup'
  title: string
  amount: number
  category: string
  date: string
  notes: string
  wallet?: string
  source_wallet?: string
  destination_wallet?: string
}

type RecordingState = 'idle' | 'listening' | 'processing' | 'result' | 'saving' | 'success'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
  return n.toLocaleString('id-ID')
}

// ── Component ────────────────────────────────────────────────────────────────
export default function VoiceTransactionPage() {
  const router = useRouter()
  const { showToast } = useToast()

  // State machine
  const [state, setState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState<ParsedTransaction[]>([])
  const [error, setError] = useState<string | null>(null)

  // Wallet state
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')
  const [sourceWalletId, setSourceWalletId] = useState<string>('')

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Silence detection refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceStartRef = useRef<number | null>(null)
  const checkSilenceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasSpokenRef = useRef<boolean>(false)

  // Recording timer (optional UX)
  const [recordingTime, setRecordingTime] = useState(0)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchWallets()
    return () => {
      stopRecording() // cleanup
    }
  }, [])

  const fetchWallets = async () => {
    const { data } = await supabase.from('wallets').select('*')
    if (data) {
      const active = data.filter((w: Wallet) => w.category === 'active')
      setWallets(data)
      const cash = active.find((w: Wallet) => w.type === 'cash')
      const first = active[0] || data[0]
      const defaultId = (cash || first)?.id?.toString() || ''
      setSelectedWalletId(defaultId)
      // Source default: second active wallet, or first
      const second = active.find((w: Wallet) => w.id?.toString() !== defaultId)
      setSourceWalletId(second?.id?.toString() || active[0]?.id?.toString() || '')
    }
  }

  // ── MediaRecorder ──────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      setError(null)
      setParsed([])
      setTranscript('')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Setup Web Audio API for Silence Detection
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 512
      analyser.minDecibels = -70 // Sensitivitas microphone
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      silenceStartRef.current = null
      hasSpokenRef.current = false

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
        
        // Convert Blob to Base64
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = () => {
          const base64data = reader.result as string
          // Remove prefix like "data:audio/webm;base64,"
          const base64String = base64data.split(',')[1]
          processWithAIAudio(base64String, mediaRecorder.mimeType || 'audio/webm')
        }
      }

      mediaRecorder.start()
      setState('listening')
      setRecordingTime(0)
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 29) {
            stopRecording() // Auto stop at 30s to save Gemini tokens
            return 30
          }
          return prev + 1
        })
      }, 1000)

      // Interval for Silence Detection (100ms checks)
      const SILENCE_THRESHOLD = 0.02 // 2% amplitude threshold for speaking
      checkSilenceIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || mediaRecorder.state !== 'recording') return
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteTimeDomainData(dataArray)
        
        let sumSquares = 0
        for (let i = 0; i < dataArray.length; i++) {
          // Time domain data is 0-255 where 128 is silence (0 amplitude)
          const normalized = (dataArray[i] - 128) / 128 
          sumSquares += normalized * normalized
        }
        const rms = Math.sqrt(sumSquares / dataArray.length)
        
        if (rms > SILENCE_THRESHOLD) {
          hasSpokenRef.current = true
          silenceStartRef.current = null // Reset timer
        } else {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now()
          } else {
            const silenceDuration = Date.now() - silenceStartRef.current
            const maxSilence = hasSpokenRef.current ? 2500 : 5000 // 2.5s jika sudah bicara, 5s jika belum
            if (silenceDuration > maxSilence) {
              stopRecording()
            }
          }
        }
      }, 100)

    } catch (err) {
      console.error('Error accessing mic:', err)
      setError('Gagal mengakses mikrofon. Pastikan izin mikrofon diberikan di browser Anda.')
      setState('idle')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
    if (checkSilenceIntervalRef.current) {
      clearInterval(checkSilenceIntervalRef.current)
      checkSilenceIntervalRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error)
      audioContextRef.current = null
    }
    analyserRef.current = null
  }

  // ── AI Processing ──────────────────────────────────────────────────────────
  const processWithAIAudio = async (audioBase64: string, mimeType: string) => {
    setState('processing')
    try {
      const response = await fetch('/api/voice-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      })
      const result = await response.json()

      if (response.status === 429) {
        setError(result.error || 'Terlalu banyak request. Coba beberapa saat lagi.')
        setState('idle')
        return
      }
      if (!response.ok || result.error) {
        setError(result.error || 'AI gagal memproses teks.')
        setState('idle')
        return
      }

      if (result.transcript) {
        setTranscript(result.transcript)
      }
      
      const transactions = result.data.transactions as ParsedTransaction[]
      
      // Auto-detect wallet from AI
      if (transactions.length > 0) {
        const firstTx = transactions[0]
        const activeWalletsList = wallets.filter(w => w.category === 'active')
        
        const findWallet = (name?: string) => {
          if (!name) return null
          const lowerName = name.toLowerCase()
          return activeWalletsList.find(w => w.name.toLowerCase().includes(lowerName) || lowerName.includes(w.name.toLowerCase()))
        }

        if (firstTx.type === 'topup') {
          const matchSrc = findWallet(firstTx.source_wallet)
          if (matchSrc && matchSrc.id) setSourceWalletId(matchSrc.id.toString())
          
          const matchDest = findWallet(firstTx.destination_wallet || firstTx.wallet)
          if (matchDest && matchDest.id) setSelectedWalletId(matchDest.id.toString())
        } else {
          const match = findWallet(firstTx.wallet)
          if (match && match.id) setSelectedWalletId(match.id.toString())
        }
      }

      // Ensure date is set for all tx
      transactions.forEach(tx => {
        if (!tx.date) tx.date = new Date().toISOString().split('T')[0]
      })
      
      setParsed(transactions)
      setState('result')
    } catch {
      setError('Gagal menghubungi server. Periksa koneksi internet.')
      setState('idle')
    }
  }

  // ── Save Transaction ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (parsed.length === 0 || !selectedWalletId) return
    setState('saving')

    try {
      const defaultWalletId = parseInt(selectedWalletId)
      const defaultSourceWalletId = parseInt(sourceWalletId)

      for (const tx of parsed) {
        const walletId = defaultWalletId
        const srcId = defaultSourceWalletId

        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance, name')
          .eq('id', walletId)
          .single()

        if (!wallet) throw new Error('Dompet tidak ditemukan')

        if (tx.type === 'pengeluaran' && wallet.balance < tx.amount) {
          throw new Error(
            `Saldo tidak mencukupi untuk ${tx.title}! Saldo ${wallet.name}: Rp ${formatRupiah(wallet.balance)}`
          )
        }

        // Timezone-safe date — same pattern as scan-receipt
        const safeDate = new Date(`${tx.date}T12:00:00`).toISOString()

        const payload: any = {
          title: tx.title,
          amount: tx.amount,
          type: tx.type,
          category: tx.category || 'Lainnya',
          wallet_id: walletId,
          date: safeDate,
          created_at: new Date().toISOString(),
          is_piutang: false,
          is_talangan: false,
          source_wallet_id: tx.type === 'topup' ? srcId : null,
        }

        if (tx.type === 'topup') {
          if (srcId === walletId) throw new Error('Sumber dan tujuan dompet tidak boleh sama!')
          const { data: srcWallet } = await supabase
            .from('wallets')
            .select('balance, name')
            .eq('id', srcId)
            .single()
          if (!srcWallet) throw new Error('Sumber dompet tidak ditemukan')
          if (srcWallet.balance < tx.amount)
            throw new Error(`Saldo ${srcWallet.name} tidak mencukupi untuk ${tx.title}!`)

          // Insert topup transaction
          const { error: insertErr } = await supabase.from('transactions').insert([payload])
          if (insertErr) throw insertErr

          // Update both wallets
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + tx.amount })
            .eq('id', walletId)
          await supabase
            .from('wallets')
            .update({ balance: srcWallet.balance - tx.amount })
            .eq('id', srcId)
        } else {
          const { error: insertErr } = await supabase.from('transactions').insert([payload])
          if (insertErr) throw insertErr

          const newBalance =
            tx.type === 'pengeluaran'
              ? wallet.balance - tx.amount
              : wallet.balance + tx.amount

          await supabase.from('wallets').update({ balance: newBalance }).eq('id', walletId)
        }
      }

      setState('success')
      showToast('success', 'Transaksi berhasil disimpan! 🎉')
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyimpan transaksi')
      setState('result')
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setParsed([])
    setTranscript('')
    setState('idle')
    setError(null)
  }

  const updateParsed = (index: number, key: keyof ParsedTransaction, value: any) => {
    setParsed(prev => prev.map((tx, i) => i === index ? { ...tx, [key]: value } : tx))
  }

  const activeWallets = wallets.filter(w => w.category === 'active')

  return (
    <main className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="top" style={{ padding: '16px 20px' }}>
        <div className="top-l">
          <button onClick={() => router.push('/')} className="icon-btn ghost" aria-label="Kembali"><ChevronLeft className="i" /></button>
          <div>
            <h1 className="h1" style={{ fontSize: 20 }}>Voice input</h1>
            <p className="sub">Catat transaksi dengan suara</p>
          </div>
        </div>
      </div>

      <div className="scroll" style={{ maxWidth: 560, margin: '0 auto', paddingTop: 0 }}>
        {/* ── SUCCESS STATE ────────────────────────────────────────────────── */}
        {state === 'success' && (
          <div className="card stack" style={{ textAlign: 'center', alignItems: 'center', padding: '28px 20px' }}>
            <div className="ic-l" style={{ background: 'var(--income-tint)', color: 'var(--income)' }}><CheckCircle2 className="i i-l" /></div>
            <h2 className="h2" style={{ marginTop: 4 }}>Berhasil disimpan!</h2>
            <div className="stack" style={{ width: '100%', marginTop: 8 }}>
              <button onClick={handleReset} className="btn btn-block"><Mic className="i i-s" />Catat lagi</button>
              <button onClick={() => router.push('/')} className="btn-2 btn-block">Kembali ke beranda</button>
            </div>
          </div>
        )}

        {/* ── IDLE / LISTENING / PROCESSING ────────────────────────────────── */}
        {(state === 'idle' || state === 'listening' || state === 'processing') && (
          <>
            {/* Mic Button Area */}
            <div className="card stack" style={{ alignItems: 'center', gap: 20, padding: '32px 20px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {state === 'listening' && (
                  <>
                    <div className="animate-ping" style={{ position: 'absolute', borderRadius: '50%', background: 'var(--danger-tint)', width: 120, height: 120, animationDuration: '2s' }} />
                    <div className="animate-ping" style={{ position: 'absolute', borderRadius: '50%', background: 'var(--danger-tint)', width: 140, height: 140, animationDuration: '3s', animationDelay: '0.5s' }} />
                  </>
                )}
                <button
                  id="voice-mic-btn"
                  onClick={state === 'idle' ? startRecording : stopRecording}
                  disabled={state === 'processing'}
                  style={{
                    position: 'relative', zIndex: 10, width: 112, height: 112, borderRadius: 32, border: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)',
                    background: state === 'listening' ? 'var(--danger)' : state === 'processing' ? 'var(--border-strong)' : 'var(--accent)',
                    cursor: state === 'processing' ? 'wait' : 'pointer',
                  }}
                >
                  {state === 'processing' ? <Loader2 className="i i-l animate-spin" /> : state === 'listening' ? <MicOff className="i i-l" /> : <Mic className="i i-l" />}
                </button>
              </div>

              <div className="stack" style={{ textAlign: 'center', gap: 4 }}>
                {state === 'idle' && (<>
                  <p className="t" style={{ fontSize: 16 }}>Tekan mic &amp; bicara</p>
                  <p className="sub" style={{ whiteSpace: 'normal' }}>Contoh: "tadi makan siang 35 ribu" atau "terima gaji 5 juta"</p>
                </>)}
                {state === 'listening' && (<>
                  <p className="t" style={{ fontSize: 16, color: 'var(--danger)' }}>Sedang mendengarkan…</p>
                  <p className="sub">Otomatis berhenti saat selesai ({30 - recordingTime}s)</p>
                </>)}
                {state === 'processing' && (<>
                  <p className="t" style={{ fontSize: 16 }}>AI sedang menganalisa…</p>
                  <p className="sub">Mohon tunggu sebentar</p>
                </>)}
              </div>
            </div>

            {/* Example chips */}
            {state === 'idle' && (
              <div className="chips">
                {['makan siang 35 ribu', 'bensin 50 ribu', 'terima gaji 5 juta', 'transfer ke bibit 500 ribu'].map(ex => (
                  <span key={ex} className="chip">{ex}</span>
                ))}
              </div>
            )}

            {error && (
              <div className="banner warn" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ whiteSpace: 'normal' }}>{error}</span>
                <button onClick={handleReset} className="link" style={{ color: 'var(--warn)' }}>Coba lagi</button>
              </div>
            )}
          </>
        )}

        {/* ── RESULT STATE ─────────────────────────────────────────────────── */}
        {(state === 'result' || state === 'saving') && parsed.length > 0 && (
          <div className="w-full max-w-lg mx-auto flex flex-col gap-6 animate-in slide-in-from-bottom-8 fade-in duration-500 pb-10">

            {/* Transcript recap */}
            {transcript && (
              <div className="brutal-card-sm p-4 bg-[var(--neo-yellow)] flex items-start gap-3">
                <Mic className="w-4 h-4 text-[var(--neo-ink)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-[var(--neo-ink)] uppercase tracking-wider mb-1">Yang AI Dengar</p>
                  <p className="text-sm text-[var(--text-primary)] font-bold italic leading-relaxed">"{transcript}"</p>
                </div>
              </div>
            )}

            {/* Review Cards (Loop over parsed transactions) */}
            <div className="flex flex-col gap-6">
              {parsed.map((tx, index) => {
                const isExpense = tx.type === 'pengeluaran'
                const isIncome = tx.type === 'pemasukan'
                const isTopup = tx.type === 'topup'

                const currentCategories = isIncome
                  ? CATEGORIES.pemasukan
                  : isTopup
                  ? [{ name: 'Transfer', color: '' }]
                  : CATEGORIES.pengeluaran

                return (
                  <div key={index} className="brutal-card p-6 bg-[var(--bg-card)]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                        {isExpense ? (
                          <div className="w-8 h-8 rounded-[8px] bg-[var(--neo-peach)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] flex items-center justify-center text-[var(--text-primary)]">
                            <ArrowDownCircle className="w-5 h-5" />
                          </div>
                        ) : isIncome ? (
                          <div className="w-8 h-8 rounded-[8px] bg-[var(--neo-mint)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] flex items-center justify-center text-[var(--text-primary)]">
                            <ArrowUpCircle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-[8px] bg-[var(--neo-sky)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] flex items-center justify-center text-[var(--text-primary)]">
                            <ArrowLeftRight className="w-5 h-5" />
                          </div>
                        )}
                        Transaksi {index + 1}
                      </h3>
                    </div>

                    <div className="flex flex-col gap-5">
                      <div className="flex border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)]">
                        {['pengeluaran', 'pemasukan', 'topup'].map((t, idx) => (
                          <button
                            key={t}
                            onClick={() => updateParsed(index, 'type', t)}
                            className={`flex-1 py-2 text-sm font-black transition-colors ${idx !== 2 ? 'border-r-2 border-[var(--neo-ink)]' : ''} ${
                              tx.type === t
                                ? t === 'pemasukan'
                                  ? 'bg-[var(--neo-mint)] text-[var(--text-primary)]'
                                  : t === 'pengeluaran'
                                  ? 'bg-[var(--neo-peach)] text-[var(--text-primary)]'
                                  : 'bg-[var(--neo-sky)] text-[var(--text-primary)]'
                                : 'bg-white text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                            }`}
                          >
                            {t === 'pemasukan' ? 'Masuk' : t === 'pengeluaran' ? 'Keluar' : 'Transfer'}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="neo-label">
                          Nominal
                        </label>
                        <div className="flex items-center gap-2 border-b-[3px] border-[var(--neo-ink)] focus-within:bg-[var(--neo-yellow)] pb-1.5 px-2 transition-colors">
                          <span className="text-[var(--text-primary)] font-black text-lg">Rp</span>
                          <input
                            type="text"
                            value={formatRupiah(tx.amount)}
                            onChange={e => {
                              const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
                              updateParsed(index, 'amount', parseInt(raw) || 0)
                            }}
                            className="w-full text-2xl font-black text-[var(--text-primary)] bg-transparent outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="neo-label">
                          Keterangan
                        </label>
                        <input
                          type="text"
                          value={tx.title}
                          onChange={e => updateParsed(index, 'title', e.target.value)}
                          className="w-full text-base font-bold text-[var(--text-primary)] bg-transparent border-b-[3px] border-[var(--neo-ink)] focus:bg-[var(--neo-yellow)] outline-none pb-1.5 px-2 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="neo-label">
                          Tanggal
                        </label>
                        <DatePickerNeo
                          value={tx.date}
                          onChange={e => updateParsed(index, 'date', e.target.value)}
                          className="w-full text-sm font-bold text-[var(--text-primary)] bg-transparent border-b-[3px] border-[var(--neo-ink)] focus:bg-[var(--neo-yellow)] outline-none pb-1.5 px-2 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="neo-label">
                          Kategori
                        </label>
                          <NeoSelect
                            value={tx.category}
                            onChange={val => updateParsed(index, 'category', val)}
                            options={currentCategories.map(c => ({ label: c.name, value: c.name }))}
                            className="w-full font-black text-[var(--text-primary)] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] px-4 py-3 transition-colors hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--neo-ink)]"
                          />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="brutal-card p-6 bg-[var(--bg-card)]">
              <h3 className="text-lg font-black text-[var(--text-primary)] mb-4">Pengaturan Dompet</h3>
              
              {parsed.some(tx => tx.type === 'topup') ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="neo-label">
                      Dari Dompet
                    </label>
                    <NeoSelect
                      value={sourceWalletId}
                      onChange={val => setSourceWalletId(val)}
                      options={activeWallets.map(w => ({ label: w.name, value: w.id.toString() }))}
                      placeholder="Pilih"
                      className="w-full text-sm font-black text-[var(--text-primary)] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] px-3 py-3 transition-colors hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--neo-ink)]"
                    />
                  </div>
                  <div>
                    <label className="neo-label">
                      Ke Dompet
                    </label>
                    <NeoSelect
                      value={selectedWalletId}
                      onChange={val => setSelectedWalletId(val)}
                      options={activeWallets.map(w => ({ label: w.name, value: w.id.toString() }))}
                      placeholder="Pilih"
                      className="w-full text-sm font-black text-[var(--text-primary)] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] px-3 py-3 transition-colors hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--neo-ink)]"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="neo-label">
                    Gunakan Dompet
                  </label>
                  <NeoSelect
                    value={selectedWalletId}
                    onChange={val => setSelectedWalletId(val)}
                    options={wallets.map(w => ({ label: `${w.name} — Rp ${formatRupiah(w.balance)}`, value: w.id.toString() }))}
                    placeholder="Pilih"
                    className="w-full font-black text-[var(--text-primary)] bg-white border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] px-4 py-3 transition-colors hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--neo-ink)]"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pb-4">
              <button
                id="voice-confirm-btn"
                onClick={handleSave}
                disabled={state === 'saving'}
                className="w-full brutal-btn !py-4 !bg-[var(--neo-mint)] text-[var(--text-primary)] disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {state === 'saving' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Simpan Transaksi ({parsed.length})
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                disabled={state === 'saving'}
                className="w-full brutal-btn !py-4 !bg-white text-[var(--text-primary)] flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Ulangi Recording
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
