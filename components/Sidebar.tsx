'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, List, PieChart, Wallet, Box, Goal, Repeat, StickyNote,
  ScanLine, Mic, Moon, Sun, Plus, PanelLeftClose, PanelLeft, MoreHorizontal,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useSidebar } from '@/hooks/useSidebar'

const mainItems = [
  { name: 'Beranda', icon: LayoutDashboard, href: '/' },
  { name: 'Riwayat', icon: List, href: '/transactions' },
  { name: 'Analitik', icon: PieChart, href: '/analytics' },
  { name: 'Dompet & tabungan', icon: Wallet, href: '/wallets' },
]
const rencanaItems = [
  { name: 'Budget', icon: Box, href: '/budgets' },
  { name: 'Goals', icon: Goal, href: '/goals' },
  { name: 'Tagihan rutin', icon: Repeat, href: '/recurring' },
  { name: 'Catatan', icon: StickyNote, href: '/notes' },
]
const cepatItems = [
  { name: 'Scan struk', icon: ScanLine, href: '/scan-receipt' },
  { name: 'Voice input', icon: Mic, href: '/voice-transaction' },
]

const mobileItems = [
  { name: 'Beranda', icon: LayoutDashboard, href: '/' },
  { name: 'Analitik', icon: PieChart, href: '/analytics' },
  { name: 'Dompet', icon: Wallet, href: '/wallets' },
  { name: 'Lainnya', icon: MoreHorizontal, href: '/more' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar()
  const isDark = theme === 'dark'

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'))

  const renderLink = (item: { name: string; icon: any; href: string }) => {
    const Icon = item.icon
    return (
      <Link key={item.href} href={item.href} className={isActive(item.href) ? 'on' : ''}>
        <Icon className="i i-s" />{item.name}
      </Link>
    )
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      {isSidebarOpen && (
        <aside className="cd side">
          <div className="brand">
            <div className="brand-mark">CD</div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-.02em' }}>CatatDuit</span>
            <button className="icon-btn ghost" style={{ marginLeft: 'auto', width: 36, height: 36 }} aria-label="Sembunyikan menu" onClick={() => setIsSidebarOpen(false)}>
              <PanelLeftClose className="i i-s" />
            </button>
          </div>

          {mainItems.map(renderLink)}
          <div className="grp">Rencana</div>
          {rencanaItems.map(renderLink)}
          <div className="grp">Catat cepat</div>
          {cepatItems.map(renderLink)}

          <div style={{ marginTop: 'auto', paddingTop: 12 }}>
            <button onClick={toggleTheme} className="" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', height: 42, width: '100%', borderRadius: 12, border: 0, background: 'transparent', color: 'var(--text-3)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              {isDark ? <Sun className="i i-s" /> : <Moon className="i i-s" />}
              {isDark ? 'Mode terang' : 'Mode gelap'}
            </button>
          </div>
        </aside>
      )}

      {/* ── Desktop reopen button when collapsed ── */}
      {!isSidebarOpen && (
        <button
          className="cd side-reopen"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Tampilkan menu"
          style={{ display: 'flex', position: 'fixed', left: 16, top: 16, zIndex: 50, width: 44, height: 44, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', alignItems: 'center', justifyContent: 'center' }}
        >
          <PanelLeft className="i" />
        </button>
      )}

      {/* ── Mobile bottom nav ── */}
      {/* Full-page transaction form has its own sticky save button (DESIGN.md 3) */}
      {pathname !== '/transaction' && <nav className="cd nav" aria-label="Navigasi utama" data-mobile-nav>
        {renderLink(mobileItems[0])}
        {renderLink(mobileItems[1])}
        <Link href="/transaction" aria-label="Tambah transaksi"><span className="fab"><Plus className="i i-l" /></span></Link>
        {renderLink(mobileItems[2])}
        {renderLink(mobileItems[3])}
      </nav>}
    </>
  )
}
