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
      <Link key={item.href} href={item.href} className={isActive(item.href) ? 'on' : ''} title={item.name} aria-label={item.name} aria-current={isActive(item.href) ? 'page' : undefined}>
        <Icon className="i i-s" /><span className="side-label">{item.name}</span>
      </Link>
    )
  }

  return (
    <>
      {/* ── Sidebar: full 248px on desktop, compact 72px on tablet or when collapsed (DESIGN.md 3) ── */}
      <aside className={`cd side ${isSidebarOpen ? '' : 'compact'}`} aria-label="Navigasi utama">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span className="side-label" style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-.02em' }}>CatatDuit</span>
        </div>

        {mainItems.map(renderLink)}
        <div className="grp"><span className="side-label">Rencana</span></div>
        {rencanaItems.map(renderLink)}
        <div className="grp"><span className="side-label">Catat cepat</span></div>
        {cepatItems.map(renderLink)}

        <div className="stack side-foot">
          <button type="button" className="side-btn" onClick={toggleTheme} title={isDark ? 'Mode terang' : 'Mode gelap'} aria-label={isDark ? 'Mode terang' : 'Mode gelap'}>
            {isDark ? <Sun className="i i-s" /> : <Moon className="i i-s" />}
            <span className="side-label">{isDark ? 'Mode terang' : 'Mode gelap'}</span>
          </button>
          <button
            type="button"
            className="side-btn side-collapse"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Ringkas menu' : 'Lebarkan menu'}
            aria-label={isSidebarOpen ? 'Ringkas menu' : 'Lebarkan menu'}
          >
            {isSidebarOpen ? <PanelLeftClose className="i i-s" /> : <PanelLeft className="i i-s" />}
            <span className="side-label">Ringkas menu</span>
          </button>
          <div className="side-profile" title="Eko Budi">
            <div className="avatar" style={{ width: 34, height: 34, fontSize: 13, borderRadius: 10 }}>EB</div>
            <span className="side-label" style={{ fontSize: 13, fontWeight: 600 }}>Eko Budi</span>
          </div>
        </div>
      </aside>

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
