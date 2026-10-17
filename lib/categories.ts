import {
  Home,
  ShoppingBag,
  Utensils,
  Car,
  Zap,
  Package,
  HeartPulse,
  CreditCard,
  Film,
  Gift,
  Briefcase,
  TrendingUp,
  Landmark,
  Coffee,
  Plane,
  Gamepad2,
  Tv,
  Smartphone,
  Book,
  Scissors,
  Music,
  Shirt,
  Smile,
  Globe,
  Dumbbell,
  GraduationCap,
  Wallet as WalletIcon,
} from 'lucide-react'
import { CustomCategoryDef } from '@/types'

// Icons that a user can pick when creating a custom category.
export const AVAILABLE_ICONS: Record<string, any> = {
  Home, ShoppingBag, Utensils, Car, Zap, Package, HeartPulse, CreditCard, Film, Gift,
  Briefcase, TrendingUp, Landmark, Coffee, Plane, Gamepad2, Tv, Smartphone, Book,
  Scissors, Music, Shirt, Smile, Globe, Dumbbell, GraduationCap,
}

// Color presets offered in the custom-category editor.
export const COLOR_PALETTES = [
  'bg-emerald-100 text-emerald-600',
  'bg-rose-100 dark:bg-rose-950/40 text-rose-600',
  'bg-blue-100 text-blue-600',
  'bg-teal-100 text-teal-600',
  'bg-yellow-100 text-yellow-600',
  'bg-purple-100 text-purple-600',
  'bg-red-100 text-red-600',
  'bg-stone-100 text-stone-600',
  'bg-pink-100 text-pink-600',
  'bg-indigo-100 text-indigo-600',
  'bg-amber-100 text-amber-600',
  'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500',
]

// Built-in categories, each with its default icon and color.
export const CATEGORIES = {
  pengeluaran: [
    { name: 'Kebutuhan Dapur', icon: ShoppingBag, color: 'bg-orange-100 text-orange-600' },
    { name: 'Makan di Luar', icon: Utensils, color: 'bg-rose-100 dark:bg-rose-950/40 text-rose-600' },
    { name: 'Transportasi', icon: Car, color: 'bg-blue-100 text-blue-600' },
    { name: 'Tempat Tinggal', icon: Home, color: 'bg-teal-100 text-teal-600' },
    { name: 'Tagihan', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
    { name: 'Belanja', icon: Package, color: 'bg-purple-100 text-purple-600' },
    { name: 'Kesehatan', icon: HeartPulse, color: 'bg-red-100 text-red-600' },
    { name: 'Cicilan & Utang', icon: CreditCard, color: 'bg-stone-100 text-stone-600' },
    { name: 'Pribadi & Hiburan', icon: Film, color: 'bg-pink-100 text-pink-600' },
    { name: 'Edukasi & Donasi', icon: Gift, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Lainnya', icon: Package, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' },
  ],
  pemasukan: [
    { name: 'Gaji', icon: Briefcase, color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Bonus & Hadiah', icon: Gift, color: 'bg-pink-100 text-pink-600' },
    { name: 'Investasi', icon: TrendingUp, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Penjualan', icon: TrendingUp, color: 'bg-amber-100 text-amber-600' },
    { name: 'Lainnya', icon: Landmark, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' },
  ],
}

type CustomCategoryMap = {
  pengeluaran: (string | CustomCategoryDef)[]
  pemasukan: (string | CustomCategoryDef)[]
}

// Resolve the icon + color for a category name, checking custom categories first,
// then built-in ones, falling back to a neutral default.
export function getCategoryIcon(
  catName: string,
  type: 'pemasukan' | 'pengeluaran' | 'topup',
  customCategories: CustomCategoryMap,
): { Icon: any; color: string } {
  if (type === 'topup') return { Icon: WalletIcon, color: 'bg-blue-100 text-blue-600' }

  // 1. Check Custom Categories
  const customList = customCategories[type] || []
  const foundCustom = customList.find(c => (typeof c === 'string' ? c : c.name) === catName)
  if (foundCustom) {
    if (typeof foundCustom === 'object') {
      return { Icon: AVAILABLE_ICONS[foundCustom.iconName] || Package, color: foundCustom.color }
    }
    return { Icon: Package, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' }
  }

  // 2. Check Standard Categories
  const allCats = [...CATEGORIES.pemasukan, ...CATEGORIES.pengeluaran]
  const found = allCats.find(c => c.name === catName)
  return found
    ? { Icon: found.icon, color: found.color }
    : { Icon: Package, color: 'bg-slate-100 dark:bg-[var(--bg-hover)] text-slate-600 dark:text-slate-500' }
}
