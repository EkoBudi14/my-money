'use client'

import { useState } from 'react'
import { Banknote, CreditCard, Wallet as WalletIcon, PiggyBank, ChevronLeft, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'

/**
 * First-run onboarding (DESIGN-TAMBAHAN §1/§2: Onboarding1 + Onboarding2).
 * Old behaviour: when the user has no wallets, two active wallets (Tunai + Rekening Bank)
 * are created automatically; step 2 optionally creates a "Tabungan" savings wallet.
 */
export async function createDefaultWallets() {
  const now = new Date().toISOString()
  return supabase.from('wallets').insert([
    { name: 'Tunai', type: 'cash', category: 'active', balance: 0, created_at: now },
    { name: 'Rekening Bank', type: 'bank', category: 'active', balance: 0, created_at: now },
  ])
}

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { showToast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [creating, setCreating] = useState(false)

  const createSavings = async () => {
    setCreating(true)
    const { error } = await supabase.from('wallets').insert({
      name: 'Tabungan', type: 'bank', category: 'savings', balance: 0, created_at: new Date().toISOString(),
    })
    setCreating(false)
    if (error) { showToast('error', 'Dompet tabungan gagal dibuat. Coba lagi.'); return }
    showToast('success', 'Dompet Tabungan ditambahkan')
    onDone()
  }

  return (
    <div className="cd onb" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <div className="onb-card scroll">
        {step === 1 ? (
          <>
            <div className="between">
              <div className="dots" aria-hidden="true"><span className="on" /><span /></div>
              <span className="lbl">Langkah 1 dari 2</span>
            </div>
            <div className="stack" style={{ gap: 8, paddingTop: 12 }}>
              <div className="brand-mark" style={{ width: 48, height: 48, borderRadius: 14, fontSize: 20 }}>C</div>
              <h1 className="h1" id="onb-title" style={{ fontSize: 26, marginTop: 8 }}>Selamat datang di CatatDuit</h1>
              <p className="sub" style={{ fontSize: 15, lineHeight: 1.5 }}>Dua dompet sudah disiapkan untuk transaksi harian. Nama dan saldonya bisa diubah nanti.</p>
            </div>
            <div className="card-flush">
              <div className="row"><div className="ic c-cash"><Banknote className="i" /></div><div className="grow"><div className="t">Tunai</div><div className="meta">Uang cash sehari-hari</div></div><span className="badge b-neutral">Saldo aktif</span></div>
              <div className="row"><div className="ic c-bank"><CreditCard className="i" /></div><div className="grow"><div className="t">Rekening Bank</div><div className="meta">Transfer dan belanja online</div></div><span className="badge b-neutral">Saldo aktif</span></div>
            </div>
            <div className="card stack" style={{ background: 'var(--surface-2)' }}>
              <h2 className="h3">Dua jenis dompet</h2>
              <div className="hstack" style={{ alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.5 }}><span className="ic-s" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}><WalletIcon className="i i-s" /></span><span><b>Saldo aktif</b>: uang untuk dipakai. Dihitung di saldo beranda.</span></div>
              <div className="hstack" style={{ alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.5 }}><span className="ic-s c-aset"><PiggyBank className="i i-s" /></span><span><b>Tabungan inti</b>: uang yang disimpan. Tidak ikut terpakai.</span></div>
            </div>
            <div className="stack" style={{ marginTop: 'auto' }}>
              <button className="btn btn-block" onClick={() => setStep(2)}>Lanjut: siapkan tabungan</button>
              <button className="btn-2 btn-block" style={{ borderColor: 'transparent' }} onClick={onDone}>Mulai mencatat saja</button>
            </div>
          </>
        ) : (
          <>
            <div className="between">
              <button className="icon-btn ghost" aria-label="Kembali ke langkah 1" style={{ marginLeft: -12 }} onClick={() => setStep(1)}><ChevronLeft className="i" /></button>
              <div className="hstack"><div className="dots" aria-hidden="true"><span className="on" /><span className="on" /></div><span className="lbl">Langkah 2 dari 2</span></div>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <span className="badge b-neutral" style={{ alignSelf: 'flex-start' }}>Opsional</span>
              <h1 className="h1" id="onb-title" style={{ fontSize: 26 }}>Siapkan dompet tabungan</h1>
              <p className="sub" style={{ fontSize: 15, lineHeight: 1.5 }}>Pisahkan uang darurat supaya tidak ikut terpakai belanja harian.</p>
            </div>
            <div className="hero stack" style={{ gap: 6 }}>
              <div className="between"><span className="lbl">Dompet baru</span><span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>Tabungan inti</span></div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Tabungan</div>
              <div className="num-xl" style={{ marginTop: 8 }}>Rp 0</div>
              <div className="lbl">Saldo awal. Bisa diisi nanti.</div>
            </div>
            <div className="card stack" style={{ background: 'var(--surface-2)', fontSize: 13, lineHeight: 1.5 }}>
              <div className="hstack" style={{ alignItems: 'flex-start', gap: 10 }}><Check className="i i-s" style={{ color: 'var(--accent)' }} />Tidak dihitung di saldo aktif beranda</div>
              <div className="hstack" style={{ alignItems: 'flex-start', gap: 10 }}><Check className="i i-s" style={{ color: 'var(--accent)' }} />Isi lewat Transfer dari dompet lain</div>
            </div>
            <div className="stack" style={{ marginTop: 'auto' }}>
              <button className="btn btn-block" disabled={creating} onClick={createSavings}>{creating ? 'Menyimpan…' : 'Buat dompet tabungan'}</button>
              <button className="btn-2 btn-block" style={{ borderColor: 'transparent' }} disabled={creating} onClick={onDone}>Lewati, nanti saja</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
