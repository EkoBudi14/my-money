# 10 — Fitur Catatan Keuangan (Notes)

## 📌 Ringkasan
Fitur notes adalah catatan teks sederhana untuk mengingatkan rencana keuangan, tips, atau memo. Catatan terbaru ditampilkan di dashboard.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/notes/page.tsx` | Halaman utama catatan — CRUD |
| `app/page.tsx` (L82-L88, L410-L435) | Interface Note, fetch latest note untuk dashboard |

---

## ⚙️ Logic Detail

### A. CRUD
**Lokasi**: `app/notes/page.tsx`

- **Create**: Insert note dengan `title`, `content`, `created_at`, `updated_at`
- **Read**: Fetch semua notes, diurutkan `updated_at` desc
- **Update**: Update `title`, `content`, `updated_at`
- **Delete**: Hapus dengan konfirmasi

### B. Dashboard Preview
**Lokasi**: `app/page.tsx` — `fetchLatestNote()` (L410-L435)

- Fetch 1 note terbaru (`.limit(1).single()`)
- Tampilkan judul + preview konten
- Tampilkan total count notes

### C. Interface Note (Local)
```typescript
// Didefinisikan di app/page.tsx L82-L88
interface Note {
    id: number
    title: string
    content: string
    created_at: string
    updated_at: string
}
```
> **Catatan**: Interface ini didefinisikan langsung di `app/page.tsx` dan `app/notes/page.tsx`, bukan di `types/index.ts`.

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Dashboard** | Menampilkan note terbaru sebagai preview card |

> Notes adalah fitur **independen** — tidak bergantung pada fitur lain.

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

Tidak ada kode sensitif khusus untuk fitur ini. Notes adalah fitur CRUD standar tanpa logika bisnis kompleks.

---

## 📝 Catatan Penting

1. Notes tidak punya interface di `types/index.ts` — didefinisikan lokal di file masing-masing.
2. Desktop: FAB (Floating Action Button) di kanan bawah untuk tambah note.
3. Desktop: Click kartu note langsung buka edit modal.
4. Character counter ditampilkan di footer modal.
