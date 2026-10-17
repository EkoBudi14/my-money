import { redirect } from 'next/navigation'

// Tabungan inti is now a tab inside the Dompet page (DESIGN.md 7.5 / route map).
export default function MainSavingsPage() {
  redirect('/wallets?tab=tabungan')
}
