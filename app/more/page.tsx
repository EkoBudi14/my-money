'use client'

import Link from 'next/link'
import { ChevronRight, Wallet, Target, Repeat, ScanLine, Mic, StickyNote, List, Moon, Tags, Download } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

const tileStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  textDecoration: 'none', color: 'var(--text)', fontSize: 12, fontWeight: 600, textAlign: 'center',
}

export default function MorePage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 116 }}>
        <h1 className="h1" style={{ paddingTop: 8 }}>Lainnya</h1>

        {/* Profile */}
        <div className="card hstack" style={{ gap: 12 }}>
          <div className="avatar">EB</div>
          <div className="grow"><div className="t">Eko Budi</div><div className="meta">CatatDuit</div></div>
        </div>

        {/* Rencana */}
        <div className="stack">
          <span className="lbl" style={{ fontWeight: 700 }}>Rencana</span>
          <div className="g3">
            <Link href="/budgets" className="tile" style={tileStyle}><span className="ic c-tagihan"><Wallet className="i" /></span>Budget</Link>
            <Link href="/goals" className="tile" style={tileStyle}><span className="ic c-bonus"><Target className="i" /></span>Goals</Link>
            <Link href="/recurring" className="tile" style={tileStyle}><span className="ic c-hiburan"><Repeat className="i" /></span>Tagihan rutin</Link>
          </div>
        </div>

        {/* Catat cepat */}
        <div className="stack">
          <span className="lbl" style={{ fontWeight: 700 }}>Catat cepat</span>
          <div className="g3">
            <Link href="/scan-receipt" className="tile" style={tileStyle}><span className="ic c-transfer"><ScanLine className="i" /></span>Scan struk</Link>
            <Link href="/voice-transaction" className="tile" style={tileStyle}><span className="ic c-transfer"><Mic className="i" /></span>Voice input</Link>
            <Link href="/notes" className="tile" style={tileStyle}><span className="ic c-lain"><StickyNote className="i" /></span>Catatan</Link>
          </div>
        </div>

        {/* Settings */}
        <div className="card-flush">
          <Link href="/transactions" className="row" style={{ textDecoration: 'none', color: 'var(--text)' }}>
            <List className="i" /><span className="grow t">Riwayat transaksi</span><ChevronRight className="i i-s" style={{ color: 'var(--text-2)' }} />
          </Link>
          <Link href="/kategori" className="row" style={{ textDecoration: 'none', color: 'var(--text)' }}>
            <Tags className="i" /><span className="grow t">Kelola kategori</span><ChevronRight className="i i-s" style={{ color: 'var(--text-2)' }} />
          </Link>
          <Link href="/transactions?export=1" className="row" style={{ textDecoration: 'none', color: 'var(--text)' }}>
            <Download className="i" /><span className="grow t">Export ke Excel</span><ChevronRight className="i i-s" style={{ color: 'var(--text-2)' }} />
          </Link>
          <div className="row">
            <Moon className="i" /><span className="grow t">Mode gelap</span>
            <button className={`switch ${isDark ? 'on' : ''}`} aria-label="Mode gelap" aria-pressed={isDark} onClick={toggleTheme} />
          </div>
        </div>
      </div>
    </div>
  )
}
