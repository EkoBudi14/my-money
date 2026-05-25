# 11 — Fitur Pengaturan & Filter

## 📌 Ringkasan
Sistem pengaturan mencakup: **dark mode**, **filter periode** (bulanan/custom), dan **sinkronisasi settings** ke Supabase. Filter digunakan di dashboard, analytics, dan budget.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/settings/page.tsx` | Halaman pengaturan — profil, dark mode, notifikasi |
| `hooks/useTheme.tsx` | Hook dark mode — toggle, persistence |
| `app/page.tsx` (L183-L383) | Filter state, settings sync, filter history |
| `app/analytics/page.tsx` (L36-L97) | Filter sync (mirror dari dashboard) |
| `app/budgets/page.tsx` (L25-L80) | Filter state (localStorage, terpisah) |
| `app/layout.tsx` | Theme provider, global providers |

---

## ⚙️ Fitur Detail

### 1. Dark Mode
**Lokasi**: `hooks/useTheme.tsx` + `app/settings/page.tsx`

- Toggle antara `'light'` dan `'dark'`
- Disimpan di `localStorage`
- Diterapkan via class `dark` di `<html>` element
- CSS variables berubah berdasarkan tema (didefinisikan di `app/globals.css`)

### 2. Filter Periode — Dashboard & Analytics
**Lokasi**: `app/page.tsx` — L183-L383

#### Mode Filter:
| Mode | Deskripsi |
|------|-----------|
| `'monthly'` | Filter berdasarkan bulan & tahun. Navigasi prev/next month |
| `'custom'` | Filter berdasarkan rentang tanggal custom (start-end) |

#### Settings Sync ke Supabase:
**Tabel**: `user_settings` (row `id=1`)

**Load** (L298-L340):
```
filter_mode → setFilterMode
custom_start_date + custom_end_date → setCustomRange
custom_categories → setCustomCategories
```

**Save** (L343-L383) — Debounced 500ms:
```
filterMode → filter_mode
customRange.start → custom_start_date
customRange.end → custom_end_date
```

**Filter History** (L362-L376):
- Custom range disimpan ke tabel `filter_history` via upsert
- Mencegah duplikat berdasarkan `(start_date, end_date)` unique constraint
- Digunakan untuk quick-select rentang yang sudah pernah dipakai

### 3. Filter Periode — Budget (TERPISAH)
**Lokasi**: `app/budgets/page.tsx` — L25-L80

> ⚠️ Budget menyimpan filter di **localStorage**, bukan Supabase.

```typescript
localStorage.setItem('budget_filterMode', filterMode)
localStorage.setItem('budget_customRange', JSON.stringify(customRange))
localStorage.setItem('budget_currentDate', currentDate.toISOString())
```

### 4. Halaman Settings
**Lokasi**: `app/settings/page.tsx`

Sections:
- **Profil Pengguna** — nama, email, badge premium (static)
- **Preferensi Aplikasi** — dark mode toggle, bahasa (static), notifikasi toggle
- **Keamanan & Data** — backup/export placeholder
- **Bantuan & Lainnya** — syarat ketentuan, logout (placeholders)

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Dashboard** | Filter mode menentukan transaksi yang ditampilkan |
| **Analytics** | Mirror filter dari dashboard via `user_settings` |
| **Budget** | Filter terpisah via localStorage |
| **Semua halaman** | Dark mode mempengaruhi tampilan semua halaman via CSS variables |

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. Settings Sync Pattern — `app/page.tsx` L298-L383
**Alasan**: Pola load-on-mount → save-on-change (debounced) yang dipakai di dashboard DAN analytics. Perubahan harus di-mirror ke kedua tempat.

### 2. `isInitialized` Guard — `app/page.tsx` L344
```typescript
if (!isInitialized) return
```
**Alasan**: Mencegah save settings ke DB sebelum settings selesai di-load dari DB. Tanpa guard ini, default values bisa overwrite saved settings.

### 3. Filter History Upsert — L362-L376
**Alasan**: `onConflict: 'start_date,end_date'` mencegah duplikat. Mengubah constraint bisa menyebabkan data ganda.

---

## 📐 Tabel Supabase

### `user_settings`
```
id: 1 (single row)
filter_mode: 'monthly' | 'custom'
custom_start_date: string (YYYY-MM-DD)
custom_end_date: string (YYYY-MM-DD)
custom_categories: JSON
updated_at: string (ISO)
```

### `filter_history`
```
id: number
start_date: string (YYYY-MM-DD)
end_date: string (YYYY-MM-DD)
label: string (human-readable)
```

---

## 📝 Catatan Penting

1. **Dua sistem filter yang terpisah**: Dashboard/Analytics menggunakan Supabase, Budget menggunakan localStorage.
2. Settings sync menggunakan **debounce 500ms** untuk mencegah excessive writes ke Supabase.
3. `isInitialized` flag sangat penting — tanpa ini, settings bisa ter-overwrite saat komponen mount.
4. Halaman settings sebagian besar masih **placeholder** (edit profil, backup, syarat ketentuan, logout belum fungsional).
5. App ini **single-user** — semua settings disimpan di row `id=1`.
