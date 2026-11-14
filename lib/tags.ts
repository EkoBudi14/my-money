import { Tag } from '@/types'

// Label colors reuse the catatduit category color classes (catatduit.css),
// so labels look at home next to categories in both themes.
export const TAG_COLORS: Record<string, { cls: string; label: string }> = {
  teal: { cls: 'c-transfer', label: 'Hijau toska' },
  blue: { cls: 'c-transport', label: 'Biru' },
  indigo: { cls: 'c-tagihan', label: 'Nila' },
  purple: { cls: 'c-hiburan', label: 'Ungu' },
  pink: { cls: 'c-belanja', label: 'Merah muda' },
  red: { cls: 'c-kesehatan', label: 'Merah' },
  orange: { cls: 'c-dapur', label: 'Oranye' },
  amber: { cls: 'c-makan', label: 'Kuning' },
  lime: { cls: 'c-gaji', label: 'Hijau muda' },
  cyan: { cls: 'c-edukasi', label: 'Biru muda' },
  slate: { cls: 'c-lain', label: 'Abu-abu' },
}

export const TAG_COLOR_KEYS = Object.keys(TAG_COLORS)

export const TAG_EMOJI_PRESETS = ['🏝️', '💍', '🎂', '🎓', '🏠', '🚗', '✈️', '🎁', '🍜', '🎮', '💼', '🏥']

export const tagClass = (tag: Pick<Tag, 'color'>) => (TAG_COLORS[tag.color] ?? TAG_COLORS.slate).cls

export const tagLabel = (tag: Pick<Tag, 'name' | 'emoji'>) => (tag.emoji ? `${tag.emoji} ${tag.name}` : tag.name)
