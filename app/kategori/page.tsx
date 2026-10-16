'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Pencil, Trash2, Plus, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'
import { AVAILABLE_ICONS, COLOR_PALETTES, CATEGORIES, getCategoryIcon } from '@/lib/categories'
import { CustomCategoryDef } from '@/types'

type TxType = 'pengeluaran' | 'pemasukan'
type CustomList = { pengeluaran: (string | CustomCategoryDef)[]; pemasukan: (string | CustomCategoryDef)[] }

const getName = (c: string | CustomCategoryDef) => (typeof c === 'string' ? c : c.name)

export default function KategoriPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { showConfirm } = useConfirm()

  const [type, setType] = useState<TxType>('pengeluaran')
  const [customCategories, setCustomCategories] = useState<CustomList>({ pengeluaran: [], pemasukan: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state for creating / editing a custom category
  const [name, setName] = useState('')
  const [iconName, setIconName] = useState('Package')
  const [color, setColor] = useState(COLOR_PALETTES[0])
  const [editingName, setEditingName] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('user_settings').select('custom_categories').eq('id', 1).single()
      if (data?.custom_categories) setCustomCategories(data.custom_categories as CustomList)
      setLoading(false)
    }
    load()
  }, [])

  const resetForm = () => {
    setName('')
    setIconName('Package')
    setColor(COLOR_PALETTES[0])
    setEditingName(null)
  }

  // Business logic mirrors app/page.tsx handleSaveCustomCategory (unchanged behavior).
  const handleSave = async () => {
    const finalName = name.trim()
    if (!finalName) return
    setSaving(true)

    const oldName = editingName
    if (!oldName && customCategories[type].map(getName).map(n => n.toLowerCase()).includes(finalName.toLowerCase())) {
      showToast('warning', 'Kategori ini sudah ada!')
      setSaving(false)
      return
    }

    let updatedList = [...customCategories[type]]
    const newDef: CustomCategoryDef = { name: finalName, iconName, color }

    if (oldName) {
      updatedList = updatedList.map(c => (getName(c) === oldName ? newDef : c))
      if (oldName !== finalName) {
        await supabase.from('transactions').update({ category: finalName }).eq('category', oldName)
      }
    } else {
      updatedList.push(newDef)
    }

    const updated = { ...customCategories, [type]: updatedList }
    const { error } = await supabase.from('user_settings').update({ custom_categories: updated }).eq('id', 1)

    if (!error) {
      setCustomCategories(updated)
      resetForm()
      showToast('success', oldName ? 'Kategori diperbarui!' : 'Kategori ditambahkan!')
    } else {
      showToast('error', 'Gagal menyimpan kategori')
    }
    setSaving(false)
  }

  // Mirrors app/page.tsx handleDeleteCustomCategory (unchanged behavior).
  const handleDelete = async (catName: string) => {
    const confirmed = await showConfirm({
      title: 'Hapus kategori?',
      message: `Hapus kategori "${catName}"? Histori asli di database tetap aman, hanya logonya tereset ke default.`,
      confirmText: 'Hapus kategori',
      cancelText: 'Batal',
    })
    if (!confirmed) return

    const updatedList = customCategories[type].filter(c => getName(c) !== catName)
    const updated = { ...customCategories, [type]: updatedList }
    const { error } = await supabase.from('user_settings').update({ custom_categories: updated }).eq('id', 1)

    if (!error) {
      setCustomCategories(updated)
      if (editingName === catName) resetForm()
      showToast('success', 'Kategori dihapus')
    } else {
      showToast('error', 'Gagal menghapus kategori')
    }
  }

  const startEdit = (c: string | CustomCategoryDef) => {
    const isStr = typeof c === 'string'
    setEditingName(isStr ? c : c.name)
    setName(isStr ? c : c.name)
    setIconName(isStr ? 'Package' : c.iconName)
    setColor(isStr ? COLOR_PALETTES[0] : c.color)
    if (typeof window !== 'undefined') window.scrollTo({ top: 9999, behavior: 'smooth' })
  }

  const customList = customCategories[type]
  const PreviewIcon = AVAILABLE_ICONS[iconName] || Package

  return (
    <div className="cd" style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div className="scroll" style={{ paddingBottom: 116, maxWidth: 560, margin: '0 auto' }}>
        {/* Header */}
        <div className="top">
          <div className="top-l">
            <button className="icon-btn ghost" aria-label="Kembali" onClick={() => router.back()}>
              <ChevronLeft className="i" />
            </button>
            <h1 className="h2" style={{ fontSize: 18 }}>Kelola kategori</h1>
          </div>
        </div>

        {/* Type tabs */}
        <div className="seg" role="tablist">
          <button className={type === 'pengeluaran' ? 'on' : ''} onClick={() => { setType('pengeluaran'); resetForm() }}>Pengeluaran</button>
          <button className={type === 'pemasukan' ? 'on' : ''} onClick={() => { setType('pemasukan'); resetForm() }}>Pemasukan</button>
        </div>

        {/* Custom category list */}
        <div className="stack">
          <div className="between">
            <span className="lbl" style={{ fontWeight: 700 }}>Kategori buatan kamu</span>
            <span className="lbl">{customList.length}</span>
          </div>

          {loading ? (
            <div className="card-flush">
              {[0, 1, 2].map(i => (
                <div key={i} className="row">
                  <div className="ic c-lain" style={{ opacity: 0.4 }}><Package className="i" /></div>
                  <span className="grow t" style={{ opacity: 0.4 }}>Memuat…</span>
                </div>
              ))}
            </div>
          ) : customList.length === 0 ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="t" style={{ whiteSpace: 'normal' }}>Belum ada kategori buatan</p>
              <p className="lbl" style={{ marginTop: 4 }}>Buat kategori baru di bawah untuk mengelompokkan transaksimu.</p>
            </div>
          ) : (
            <div className="card-flush">
              {customList.map(c => {
                const cName = getName(c)
                const { Icon, color: cColor } = getCategoryIcon(cName, type, customCategories)
                return (
                  <div className="row" key={cName}>
                    <div className={`ic ${cColor}`}><Icon className="i" /></div>
                    <span className="grow t">{cName}</span>
                    <button className="icon-btn ghost" aria-label={`Ubah ${cName}`} onClick={() => startEdit(c)}>
                      <Pencil className="i i-s" />
                    </button>
                    <button className="icon-btn ghost" aria-label={`Hapus ${cName}`} style={{ color: 'var(--danger)' }} onClick={() => handleDelete(cName)}>
                      <Trash2 className="i i-s" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <span className="lbl">
            Kategori bawaan ({CATEGORIES[type].slice(0, 2).map(c => c.name).join(', ')}, dan lainnya) tidak bisa diubah atau dihapus.
          </span>
        </div>

        {/* Create / edit form */}
        <div className="card stack-12" style={{ background: 'var(--surface-2)' }}>
          <h2 className="h2">{editingName ? 'Ubah kategori' : 'Buat kategori baru'}</h2>

          <label className="field">
            Nama kategori
            <input
              className="input"
              type="text"
              placeholder="Parkir"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ background: 'var(--surface)' }}
            />
          </label>

          <div className="field">
            Ikon
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
              {Object.keys(AVAILABLE_ICONS).map(key => {
                const Ico = AVAILABLE_ICONS[key]
                return (
                  <button
                    key={key}
                    type="button"
                    className={`icb ${iconName === key ? 'on' : ''}`}
                    aria-label={`Ikon ${key}`}
                    aria-pressed={iconName === key}
                    onClick={() => setIconName(key)}
                  >
                    <Ico className="i" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="field">
            Warna
            <div className="hstack" style={{ flexWrap: 'wrap', gap: 10 }}>
              {COLOR_PALETTES.map((col, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`swc ${col.split(' ')[0]} ${color === col ? 'on' : ''}`}
                  aria-label={`Warna ${idx + 1}`}
                  aria-pressed={color === col}
                  onClick={() => setColor(col)}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="tile hstack" style={{ gap: 12 }}>
            <div className={`ic ${color}`}><PreviewIcon className="i" /></div>
            <div>
              <div className="lbl">Pratinjau</div>
              <div className="t">{name.trim() || 'Nama kategori'}</div>
            </div>
          </div>

          <div className="hstack" style={{ gap: 8 }}>
            {editingName && (
              <button className="btn-2" onClick={resetForm} disabled={saving}>Batal</button>
            )}
            <button className="btn btn-block" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Menyimpan…' : editingName ? 'Simpan perubahan' : 'Simpan kategori'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
