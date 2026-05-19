'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, Loader2, ScanLine, Save, CheckCircle2, FlipHorizontal, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Wallet, CATEGORIES } from '@/types'

export default function ScanReceiptPage() {
    const router = useRouter()
    const { showToast } = useToast()
    
    const [image, setImage] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [scanResult, setScanResult] = useState<any | null>(null)
    
    const [wallets, setWallets] = useState<Wallet[]>([])
    const [selectedWalletId, setSelectedWalletId] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    // Rate limit state
    const [rateLimitInfo, setRateLimitInfo] = useState<{ retryAfter: number; isPerDay: boolean; total: number; resetTime: string } | null>(null)
    const [rateLimitCountdown, setRateLimitCountdown] = useState(0)

    // Camera state
    const [showCamera, setShowCamera] = useState(false)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
    
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        fetchWallets()
    }, [])

    // Countdown timer for rate limit
    useEffect(() => {
        if (rateLimitCountdown <= 0) return
        const timer = setInterval(() => {
            setRateLimitCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [rateLimitCountdown])

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(t => t.stop())
            }
        }
    }, [cameraStream])

    const fetchWallets = async () => {
        const { data } = await supabase.from('wallets').select('*')
        if (data) {
            setWallets(data)
            const cashWallet = data.find((w: Wallet) => w.type === 'cash')
            if (cashWallet) setSelectedWalletId(cashWallet.id.toString())
            else if (data.length > 0) setSelectedWalletId(data[0].id.toString())
        }
    }

    // ── CAMERA ────────────────────────────────────────────────────────────────
    const openCamera = async (facing: 'environment' | 'user' = 'environment') => {
        // Stop existing stream first
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }
            })
            setCameraStream(stream)
            setFacingMode(facing)
            setShowCamera(true)

            // Attach to video element after render
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play()
                }
            }, 100)
        } catch (err: any) {
            showToast('error', 'Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan di browser.')
        }
    }

    const flipCamera = () => {
        openCamera(facingMode === 'environment' ? 'user' : 'environment')
    }

    // ── COMPRESS ─────────────────────────────────────────────────────────────
    const compressImage = (sourceCanvas: HTMLCanvasElement | HTMLImageElement, w: number, h: number): string => {
        const MAX_DIM = 1280
        let targetW = w
        let targetH = h
        if (targetW > MAX_DIM) { targetH = Math.round(targetH * MAX_DIM / targetW); targetW = MAX_DIM }
        if (targetH > MAX_DIM) { targetW = Math.round(targetW * MAX_DIM / targetH); targetH = MAX_DIM }
        const offscreen = document.createElement('canvas')
        offscreen.width = targetW
        offscreen.height = targetH
        offscreen.getContext('2d')?.drawImage(sourceCanvas, 0, 0, targetW, targetH)
        return offscreen.toDataURL('image/jpeg', 0.75)
    }

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        const dataUrl = compressImage(canvas, video.videoWidth, video.videoHeight)
        setImage(dataUrl)
        closeCamera()
    }

    const closeCamera = () => {
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop())
        setCameraStream(null)
        setShowCamera(false)
    }

    // ── GALLERY ───────────────────────────────────────────────────────────────
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const objectUrl = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            const dataUrl = compressImage(img, img.naturalWidth, img.naturalHeight)
            setImage(dataUrl)
            setScanResult(null)
            setIsSuccess(false)
        }
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            showToast('error', 'Gagal memuat gambar. Coba format lain.')
        }
        img.src = objectUrl
    }

    // ── SCAN ──────────────────────────────────────────────────────────────────────────
    const handleScan = async () => {
        if (!image) return
        setIsScanning(true)
        try {
            const response = await fetch('/api/scan-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image })
            })
            const result = await response.json()

            // Handle rate limit specifically
            if (response.status === 429) {
                const retryAfter = result.retryAfter ?? 60
                const isPerDay = result.isPerDay ?? false
                let resetTime: string

                if (isPerDay) {
                    // Kuota harian reset tengah malam Pacific Time → hitung ke WIB
                    const ptParts = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/Los_Angeles',
                        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
                    }).formatToParts(new Date())
                    const ptH = parseInt(ptParts.find((p: any) => p.type === 'hour')?.value || '0') % 24
                    const ptM = parseInt(ptParts.find((p: any) => p.type === 'minute')?.value || '0')
                    const ptS = parseInt(ptParts.find((p: any) => p.type === 'second')?.value || '0')
                    const msUntilMidnightPT = ((23 - ptH) * 3600 + (59 - ptM) * 60 + (60 - ptS)) * 1000
                    const nextMidnightPT = new Date(Date.now() + msUntilMidnightPT)
                    resetTime = nextMidnightPT.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
                } else {
                    // Rate limit per menit → hitung dari retryAfter
                    const resetAt = new Date(Date.now() + retryAfter * 1000)
                    resetTime = resetAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
                }

                setRateLimitInfo({ retryAfter, isPerDay, total: retryAfter, resetTime })
                setRateLimitCountdown(retryAfter)
                throw new Error(result.error || 'Rate limit exceeded')
            }

            if (!response.ok || result.error) throw new Error(result.error || 'Gagal memproses struk')
            
            // Format result to ensure properties exist
            const data = result.data
            setScanResult({
                document_type: data.document_type || 'struk_belanja',
                store_name: data.store_name || '',
                date: data.date || new Date().toISOString().split('T')[0],
                total: data.total || 0,
                category: data.category || 'Belanja',
                transaction_type: data.transaction_type || 'pengeluaran',
                description: data.description || '',
                discount: data.discount || 0,
                extra_fees: data.extra_fees || 0,
                items: data.items || []
            })
        } catch (error: any) {
            showToast('error', error.message)
        } finally {
            setIsScanning(false)
        }
    }

    const handleItemChange = (idx: number, field: string, value: any) => {
        if (!scanResult) return
        const newItems = [...scanResult.items]
        newItems[idx] = { ...newItems[idx], [field]: value }
        
        // Auto-recalculate total when items change
        const newTotal = newItems.reduce((acc, item) => acc + (item.qty * item.price), 0)
        
        setScanResult({
            ...scanResult,
            items: newItems,
            total: newTotal
        })
    }

    const handleDeleteItem = (idx: number) => {
        if (!scanResult) return
        const newItems = scanResult.items.filter((_: any, i: number) => i !== idx)
        
        const newTotal = newItems.reduce((acc: number, item: any) => acc + (item.qty * item.price), 0)
        
        setScanResult({
            ...scanResult,
            items: newItems,
            total: newTotal
        })
    }

    const handleResultChange = (field: string, value: any) => {
        if (!scanResult) return
        setScanResult({ ...scanResult, [field]: value })
    }

    // ── SAVE ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!scanResult || !selectedWalletId) return
        setIsSaving(true)
        try {
            const walletId = parseInt(selectedWalletId)
            const txType = scanResult.transaction_type || 'pengeluaran'
            const { data: wallet } = await supabase.from('wallets').select('balance, name').eq('id', walletId).single()
            if (!wallet) throw new Error('Dompet tidak ditemukan')

            // Cek saldo hanya untuk pengeluaran
            if (txType === 'pengeluaran' && wallet.balance < scanResult.total) {
                throw new Error(`Saldo tidak mencukupi! Saldo ${wallet.name}: Rp ${wallet.balance.toLocaleString('id-ID')}`)
            }

            // Generate judul berdasarkan jenis dokumen
            let title = ''
            if (scanResult.document_type === 'bukti_transfer') {
                title = txType === 'pemasukan'
                    ? `Terima Transfer dari ${scanResult.store_name}`
                    : `Transfer ke ${scanResult.store_name}`
            } else if (scanResult.document_type === 'tagihan') {
                title = `Tagihan ${scanResult.store_name}`
            } else {
                title = `Belanja di ${scanResult.store_name}`
            }

            const safeDate = new Date(`${scanResult.date}T12:00:00`).toISOString()
            const payload = {
                title,
                amount: scanResult.total,
                type: txType,
                category: scanResult.category || 'Belanja',
                wallet_id: walletId,
                date: safeDate,
                created_at: new Date().toISOString(),
                is_piutang: false,
                is_talangan: false
            }
            const { error: insertError } = await supabase.from('transactions').insert([payload])
            if (insertError) throw insertError

            // Update saldo: kurangi untuk pengeluaran, tambah untuk pemasukan
            const newBalance = txType === 'pemasukan'
                ? wallet.balance + scanResult.total
                : wallet.balance - scanResult.total
            await supabase.from('wallets').update({ balance: newBalance }).eq('id', walletId)

            setIsSuccess(true)
            showToast('success', 'Dokumen berhasil disimpan!')
        } catch (error: any) {
            showToast('error', error.message)
        } finally {
            setIsSaving(false)
        }
    }

    // ── RESET ─────────────────────────────────────────────────────────────────
    const resetState = () => {
        setImage(null)
        setScanResult(null)
        setIsSuccess(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <main className="min-h-screen bg-[#EFF2F7] pb-24 md:pb-8">

            {/* ── CAMERA MODAL ─────────────────────────────────────────────── */}
            {showCamera && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col">
                    <div className="flex items-center justify-between p-4 text-white">
                        <span className="font-semibold text-base">Foto Struk</span>
                        <button onClick={closeCamera} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {/* Viewfinder overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-4/5 h-3/5 border-2 border-white/60 rounded-2xl relative">
                                <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl" />
                                <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl" />
                                <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl" />
                            </div>
                        </div>
                        <p className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-xs">Arahkan kamera ke struk</p>
                    </div>

                    <div className="flex items-center justify-center gap-8 p-8 pb-10">
                        {/* Flip camera */}
                        <button onClick={flipCamera} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <FlipHorizontal className="w-5 h-5 text-white" />
                        </button>
                        {/* Shutter */}
                        <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-4 border-white/30 shadow-2xl hover:scale-95 transition-transform active:scale-90" />
                        {/* Spacer */}
                        <div className="w-12 h-12" />
                    </div>

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* ── HEADER ───────────────────────────────────────────────────── */}
            <header className="bg-white px-5 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40 border-b border-[#F3F4F3]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#165DFF]/10 rounded-xl flex items-center justify-center">
                        <ScanLine className="w-5 h-5 text-[#165DFF]" />
                    </div>
                    <div>
                        <h1 className="font-bold text-[#080C1A] text-lg leading-tight">Scan Struk</h1>
                        <p className="text-xs text-[#6A7686]">Catat pengeluaran otomatis pakai AI</p>
                    </div>
                </div>
                <button onClick={() => router.push('/')} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#EFF2F7] text-[#6A7686] hover:bg-slate-200 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </header>

            <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">

                {/* ── SUCCESS ──────────────────────────────────────────────── */}
                {isSuccess ? (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#F3F4F3] text-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Berhasil Disimpan!</h2>
                        <p className="text-slate-500 mb-8">Transaksi telah ditambahkan ke pengeluaran Anda.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={resetState} className="w-full py-3.5 bg-[#165DFF] hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors">
                                Scan Struk Lagi
                            </button>
                            <button onClick={() => router.push('/')} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors">
                                Kembali ke Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── UPLOAD AREA ──────────────────────────────────── */}
                        {!image && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F3F4F3] space-y-4">
                                <div className="aspect-[4/3] w-full rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-4 bg-slate-50">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <Camera className="w-8 h-8 text-[#165DFF]" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold text-slate-700">Ambil Foto / Upload Struk</p>
                                        <p className="text-sm text-slate-500 mt-1">Pastikan tulisan terbaca jelas</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Foto — buka kamera via getUserMedia */}
                                    <button
                                        onClick={() => openCamera('environment')}
                                        className="flex items-center justify-center gap-2 py-3.5 bg-[#165DFF] text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                                    >
                                        <Camera className="w-4 h-4" /> Foto
                                    </button>

                                    {/* Galeri — buka file picker */}
                                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center gap-2 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                                    >
                                        <Upload className="w-4 h-4" /> Galeri
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── RATE LIMIT BANNER ───────────────────────────────── */}
                        {rateLimitInfo && rateLimitCountdown > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 animate-in fade-in">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg">⏳</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-amber-800 text-sm">
                                            {rateLimitInfo.isPerDay ? 'Kuota Harian Habis' : 'Terlalu Banyak Request'}
                                        </p>
                                        <p className="text-xs text-amber-600 mt-0.5">
                                            {rateLimitInfo.isPerDay
                                                ? `Kuota harian habis. Reset pukul ${rateLimitInfo.resetTime} WIB.`
                                                : `Batas request per menit tercapai. Bisa scan lagi sekitar pukul ${rateLimitInfo.resetTime} WIB.`}
                                        </p>
                                        <div className="mt-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-medium text-amber-700">Bisa scan lagi dalam:</span>
                                                <span className="text-sm font-bold text-amber-800 tabular-nums">
                                                    {rateLimitCountdown >= 3600
                                                        ? `${Math.floor(rateLimitCountdown / 3600)}j ${Math.floor((rateLimitCountdown % 3600) / 60)}m`
                                                        : rateLimitCountdown >= 60
                                                            ? `${Math.floor(rateLimitCountdown / 60)}m ${rateLimitCountdown % 60}s`
                                                            : `${rateLimitCountdown}s`
                                                    }
                                                </span>
                                            </div>
                                            <div className="w-full bg-amber-200 rounded-full h-1.5">
                                                <div
                                                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000"
                                                    style={{ width: `${(rateLimitCountdown / rateLimitInfo.total) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── IMAGE PREVIEW ─────────────────────────────────── */}
                        {image && !scanResult && (
                            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#F3F4F3] animate-in fade-in">
                                <div className="relative aspect-[3/4] w-full bg-slate-900">
                                    <img src={image} alt="Struk" className="w-full h-full object-contain" />
                                    <button onClick={resetState} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-5">
                                    <button
                                        onClick={handleScan}
                                        disabled={isScanning || rateLimitCountdown > 0}
                                        className="w-full py-4 bg-[#165DFF] hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-200 disabled:shadow-none"
                                    >
                                        {isScanning ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Menganalisa Struk...</>
                                        ) : (
                                            <><ScanLine className="w-5 h-5" /> Proses dengan AI</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── SCAN RESULT ───────────────────────────────────── */}
                        {scanResult && !isSuccess && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F3F4F3]">
                                    <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-dashed border-slate-200">

                                        {/* ─ Document type badge ─ */}
                                        <div className="flex items-center gap-2">
                                            {scanResult.document_type === 'bukti_transfer' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">🏦 Bukti Transfer</span>
                                            ) : scanResult.document_type === 'tagihan' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">📄 Tagihan</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">🧾 Struk Belanja</span>
                                            )}
                                        </div>

                                        {/* ─ Transfer direction toggle ─ */}
                                        {scanResult.document_type === 'bukti_transfer' && (
                                            <div className="flex rounded-xl overflow-hidden border border-slate-200">
                                                <button
                                                    onClick={() => handleResultChange('transaction_type', 'pengeluaran')}
                                                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                                                        scanResult.transaction_type === 'pengeluaran'
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-white text-slate-500 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    ↑ Transfer Keluar
                                                </button>
                                                <button
                                                    onClick={() => handleResultChange('transaction_type', 'pemasukan')}
                                                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                                                        scanResult.transaction_type === 'pemasukan'
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-white text-slate-500 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    ↓ Terima Transfer
                                                </button>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Nama Toko</label>
                                            <input 
                                                type="text"
                                                value={scanResult.store_name}
                                                onChange={(e) => handleResultChange('store_name', e.target.value)}
                                                className="w-full text-xl font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-[#165DFF] outline-none pb-1 transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Tanggal</label>
                                                <input 
                                                    type="date"
                                                    value={scanResult.date}
                                                    onChange={(e) => handleResultChange('date', e.target.value)}
                                                    className="w-full text-slate-700 bg-transparent border-b border-slate-200 focus:border-[#165DFF] outline-none pb-1 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Total Belanja</label>
                                                <div className="flex items-center border-b border-slate-200 focus-within:border-[#165DFF] transition-colors pb-1">
                                                    <span className="text-[#165DFF] font-bold mr-1">Rp</span>
                                                    <input 
                                                        type="text"
                                                        value={scanResult.total.toLocaleString('id-ID')}
                                                        onChange={(e) => handleResultChange('total', parseInt(e.target.value.replace(/\./g, '')) || 0)}
                                                        className="w-full text-xl font-bold text-[#165DFF] bg-transparent outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ─ Keterangan transfer ─ */}
                                        {scanResult.document_type === 'bukti_transfer' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Keterangan Transfer</label>
                                                <input
                                                    type="text"
                                                    value={scanResult.description || ''}
                                                    onChange={(e) => handleResultChange('description', e.target.value)}
                                                    placeholder="Keterangan transfer..."
                                                    className="w-full text-sm text-slate-700 bg-transparent border-b border-slate-200 focus:border-[#165DFF] outline-none pb-1 transition-colors"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Detail item hanya tampil untuk struk & tagihan */}
                                    {scanResult.document_type !== 'bukti_transfer' && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center justify-between">
                                            Detail Item
                                        </h3>
                                        <div className="space-y-3">
                                            {scanResult.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-slate-300 focus-within:shadow-sm transition-all relative">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <input 
                                                            type="text"
                                                            value={item.name}
                                                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                                            className="w-full text-sm font-medium text-slate-800 bg-transparent outline-none"
                                                            placeholder="Nama Item"
                                                        />
                                                        <button 
                                                            onClick={() => handleDeleteItem(idx)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1 rounded-md hover:bg-red-50"
                                                            title="Hapus Item"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm mt-1">
                                                        {/* Kiri: qty x @harga satuan */}
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <span className="text-xs">x</span>
                                                            <input 
                                                                type="number"
                                                                value={item.qty}
                                                                onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                                                                className="w-10 bg-white border border-slate-200 rounded text-center text-xs outline-none focus:border-[#165DFF] py-0.5"
                                                            />
                                                            <span className="text-xs text-slate-400">@Rp</span>
                                                            <input 
                                                                type="text"
                                                                value={item.price.toLocaleString('id-ID')}
                                                                onChange={(e) => handleItemChange(idx, 'price', parseInt(e.target.value.replace(/\./g, '')) || 0)}
                                                                className="w-20 bg-white border border-slate-200 rounded text-right text-xs px-1 outline-none focus:border-[#165DFF] py-0.5"
                                                            />
                                                        </div>
                                                        {/* Kanan: subtotal (read-only) */}
                                                        <div className="flex items-center gap-0.5">
                                                            <span className="text-xs text-slate-400">Rp</span>
                                                            <span className="font-semibold text-slate-800 text-sm tabular-nums">
                                                                {(item.qty * item.price).toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {scanResult.items.length === 0 && (
                                                <p className="text-sm text-slate-500 text-center py-2">Tidak ada detail item yang terdeteksi.</p>
                                            )}
                                        </div>
                                    </div>
                                    )} {/* end: detail item for non-transfer */}

                                    {/* ── BREAKDOWN DISKON & BIAYA TAMBAHAN ── */}
                                    {(scanResult.discount > 0 || scanResult.extra_fees > 0) && (
                                        <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
                                            <div className="flex justify-between text-sm text-slate-500">
                                                <span>Subtotal Item</span>
                                                <span>Rp {scanResult.items.reduce((a: number, i: any) => a + i.qty * i.price, 0).toLocaleString('id-ID')}</span>
                                            </div>
                                            {scanResult.discount > 0 && (
                                                <div className="flex justify-between text-sm text-emerald-600 font-medium">
                                                    <span>Diskon / Voucher</span>
                                                    <span>- Rp {scanResult.discount.toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                            {scanResult.extra_fees > 0 && (
                                                <div className="flex justify-between text-sm text-slate-500">
                                                    <span>Biaya Tambahan (Ongkir, dll)</span>
                                                    <span>+ Rp {scanResult.extra_fees.toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm font-bold text-slate-800 pt-2 border-t border-slate-200">
                                                <span>Total Dibayar</span>
                                                <span className="text-[#165DFF]">Rp {scanResult.total.toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-6 border-t border-slate-100">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Kategori Pengeluaran</label>
                                            <select
                                                value={scanResult.category}
                                                onChange={(e) => handleResultChange('category', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF] outline-none transition-all appearance-none"
                                            >
                                                <option value={scanResult.category}>{scanResult.category}</option>
                                                {CATEGORIES.pengeluaran.filter(c => c.name !== scanResult.category).map((cat, idx) => (
                                                    <option key={idx} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Dompet Pengeluaran</label>
                                            <select
                                                value={selectedWalletId}
                                                onChange={(e) => setSelectedWalletId(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#165DFF]/20 focus:border-[#165DFF] outline-none transition-all appearance-none"
                                            >
                                                <option value="" disabled>Pilih dompet...</option>
                                                {wallets.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name} (Rp {w.balance.toLocaleString('id-ID')})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={resetState} className="py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                                        Ulangi Foto
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="py-4 bg-[#165DFF] text-white rounded-xl font-semibold hover:bg-blue-600 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
