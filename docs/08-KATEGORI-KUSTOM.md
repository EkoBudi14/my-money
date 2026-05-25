# 08 — Fitur Kategori Kustom

## 📌 Ringkasan
User bisa membuat kategori pengeluaran/pemasukan sendiri dengan **nama, icon, dan warna** custom. Kategori kustom disimpan di tabel `user_settings` (kolom `custom_categories`).

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/page.tsx` (L196-L295) | State, CRUD logic untuk kategori kustom |
| `components/TransactionModal.tsx` | UI kategori kustom dalam form transaksi |
| `types/index.ts` — `CustomCategoryDef` | Interface definisi kategori kustom |
| `app/budgets/page.tsx` | Menggunakan custom categories untuk form budget |

---

## ⚙️ Logic Detail

### A. Struktur Data
Kategori kustom disimpan sebagai JSON di `user_settings.custom_categories`:

```json
{
  "pengeluaran": [
    { "name": "Kopi", "iconName": "Coffee", "color": "bg-amber-100 text-amber-600" },
    { "name": "Gym", "iconName": "Dumbbell", "color": "bg-blue-100 text-blue-600" }
  ],
  "pemasukan": [
    { "name": "Freelance", "iconName": "Briefcase", "color": "bg-emerald-100 text-emerald-600" }
  ]
}
```

### B. Tambah Kategori
**Lokasi**: `app/page.tsx` — `handleSaveCustomCategory()` (L211-L257)

Alur:
1. User buka form "Tambah Kategori" di dalam form transaksi
2. Input: nama, pilih icon, pilih warna
3. **Cek duplikat**: nama tidak boleh sama (case-insensitive)
4. Buat `CustomCategoryDef` object
5. Update `custom_categories` di `user_settings` (Supabase)

### C. Edit Kategori
**Lokasi**: `app/page.tsx` — `openEditCategory()` + `handleSaveCustomCategory()`

Alur:
1. User klik edit pada kategori kustom
2. Load data ke form (nama, icon, warna)
3. Jika nama berubah → **update semua transaksi** yang pakai nama lama:
   ```typescript
   await supabase.from('transactions').update({ category: finalName }).eq('category', oldNameObj)
   ```

### D. Hapus Kategori
**Lokasi**: `app/page.tsx` — `handleDeleteCustomCategory()` (L259-L285)

Alur:
1. Konfirmasi hapus
2. Remove dari array `custom_categories`
3. Update `user_settings` di Supabase
4. **Transaksi yang sudah pakai kategori ini tetap ada** — hanya icon dan warna yang kembali ke default

### E. Icon System
**Lokasi**: `app/page.tsx` — `AVAILABLE_ICONS` (L61-L65)

26 icon Lucide yang tersedia:
`Home, ShoppingBag, Utensils, Car, Zap, Package, HeartPulse, CreditCard, Film, Gift, Briefcase, TrendingUp, Landmark, Coffee, Plane, Gamepad2, Tv, Smartphone, Book, Scissors, Music, Shirt, Smile, Globe, Dumbbell, GraduationCap`

### F. Color System
**Lokasi**: `app/page.tsx` — `COLOR_PALETTES` (L67-L80)

12 palet warna Tailwind yang tersedia.

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Transaksi** | Form transaksi menampilkan kategori kustom + bawaan. Rename kategori → update semua transaksi |
| **Budget** | Form budget menampilkan kategori kustom untuk pilihan kategori |
| **Analytics** | Kategori kustom muncul di breakdown per kategori |
| **Dashboard** | Icon & warna kategori kustom ditampilkan di list transaksi |
| **Recurring Bills** | Trigger `billsUpdateTrigger` saat save kategori untuk refresh |

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. Rename Category Logic — L234-L236
```typescript
if (oldNameObj !== finalName) {
    await supabase.from('transactions').update({ category: finalName }).eq('category', oldNameObj)
}
```
**Alasan**: Batch update semua transaksi saat rename kategori. Jika terhapus, riwayat transaksi lama akan "orphaned" dari kategori.

### 2. `getCategoryIcon()` di `app/page.tsx` — L1236-L1260
**Alasan**: Fungsi resolve icon+warna yang dipakai di seluruh dashboard. Urutan lookup penting: custom categories → standard categories.

### 3. AVAILABLE_ICONS mapping — L61-L65
**Alasan**: String-to-component mapping. Jika icon dihapus dari sini, semua kategori kustom yang pakai icon tersebut akan fallback ke icon default.

---

## 📐 Interface Data

```typescript
export interface CustomCategoryDef {
    id?: string
    name: string
    iconName: string    // Nama icon dari AVAILABLE_ICONS
    color: string       // Tailwind class string (e.g., 'bg-amber-100 text-amber-600')
}
```

---

## 📝 Catatan Penting

1. Kategori kustom disimpan di `user_settings` (row id=1), bukan tabel terpisah.
2. **Legacy support**: Beberapa kategori kustom lama bisa berupa `string` (bukan `CustomCategoryDef` object). Kode harus handle kedua format: `typeof c === 'string' ? c : c.name`.
3. Hapus kategori **tidak menghapus transaksi** — hanya logo/warna yang hilang.
4. `CATEGORIES` bawaan dan custom categories digabung saat ditampilkan di form transaksi.
