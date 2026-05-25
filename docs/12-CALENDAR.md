# 12 — Fitur Kalender & Event

## 📌 Ringkasan
Fitur kalender menampilkan hari libur nasional (didapat dari API), catatan, dan pengingat kustom (events) yang bisa ditambahkan oleh user.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `components/CalendarCard.tsx` | Komponen utama kalender (UI + logika kalender) |
| `components/AddEventModal.tsx` | Modal form untuk tambah/edit event kustom |
| `app/api/holidays/route.ts` | API route untuk fetch hari libur (scrapping/API pihak ketiga) |
| `types/index.ts` — `CalendarEvent` | Interface data event |

---

## ⚙️ Logic Detail

### A. Tampilan Kalender
**Lokasi**: `components/CalendarCard.tsx`

- Render grid 7x6 (maksimal) untuk bulan yang dipilih
- Menyorot hari ini (current date)
- Navigasi bulan (Prev/Next)
- Indikator dot untuk hari yang memiliki event/libur

### B. Hari Libur Nasional
**Lokasi**: `app/api/holidays/route.ts` & `components/CalendarCard.tsx`

- Fetch dari API internal (`/api/holidays?year=YYYY&month=MM`)
- Hari libur ditandai dengan warna khusus (biasanya merah)
- Data di-cache atau di-fetch per navigasi bulan

### C. Custom Events (Reminder / Note)
**Lokasi**: `components/CalendarCard.tsx` & `components/AddEventModal.tsx`

**Tambah Event**:
- User klik pada tanggal tertentu
- Modal `AddEventModal` terbuka dengan field: `title`, `type` (note/reminder), dan `color`
- Event disimpan ke tabel `calendar_events`

**Edit/Hapus Event**:
- User klik event yang sudah ada pada daftar event di bawah kalender
- Bisa edit `title`, `type`, `color` atau menghapus event

### D. Interaksi Tanggal
- Klik tanggal tanpa event: Buka `AddEventModal` untuk tanggal tersebut
- Klik tanggal dengan event: Menampilkan daftar event pada tanggal tersebut di bawah kalender

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Dashboard** | Komponen `CalendarCard` ditampilkan di dashboard |

> Fitur kalender bersifat **independen** — tidak terkait dengan transaksi, wallet, atau budget.

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. Perhitungan Grid Kalender
**Alasan**: Algoritma pembuatan grid kalender (menentukan hari mulai bulan, jumlah hari dalam bulan) harus akurat agar hari-hari berada di bawah kolom hari (Senin-Minggu) yang benar.

### 2. Fetch API Hari Libur
**Alasan**: Jika sumber data hari libur berubah format, parsing logic di `app/api/holidays/route.ts` dan di client harus disesuaikan.

---

## 📐 Interface Data

```typescript
export interface CalendarEvent {
    id: number
    date: string // YYYY-MM-DD
    title: string
    type: 'note' | 'reminder'
    color: 'blue' | 'red' | 'green' | 'yellow' | 'purple'
    created_at?: string
}
```

---

## 📝 Catatan Penting

1. Hari libur (`holidays`) dan custom events (`events`) **digabung** saat ditampilkan pada dot indikator kalender dan daftar event di bawahnya.
2. Form edit dan tambah menggunakan modal yang sama (`AddEventModal`) dengan membedakan apakah properti `event` di-pass atau tidak.
3. Event custom diurutkan berdasarkan `created_at` atau urutan ditambahkan.
