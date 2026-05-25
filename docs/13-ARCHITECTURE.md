# 13 — Arsitektur & Infrastruktur

## 📌 Ringkasan
Dokumen ini menjelaskan tech stack, arsitektur database (Supabase), pola state management, dan struktur direktori yang digunakan dalam My-Money.

---

## 🛠 Tech Stack

| Kategori | Teknologi | Penjelasan |
|----------|-----------|------------|
| **Framework** | Next.js (App Router) | Menggunakan App Router (`app/`) dengan React Server Components (sebagian) dan Client Components (`'use client'`). |
| **Language** | TypeScript | Typed language untuk mencegah runtime errors. Types utama ada di `types/index.ts`. |
| **Backend/DB** | Supabase | PostgreSQL-based BaaS. Digunakan untuk Database, API keys (via env var). |
| **Styling** | Tailwind CSS | Utility-first CSS untuk styling, responsivitas, dan dark mode. |
| **Icons** | Lucide React | Library icon SVG konsisten. |
| **Charts** | Recharts | Untuk visualisasi data di halaman Analytics. |
| **AI (OCR)** | Google Gemini API | Untuk ekstraksi data struk/transfer di fitur Scan Receipt. |

---

## 🗄 Arsitektur Database (Supabase)

Tabel utama di database PostgreSQL Supabase:

1. **`transactions`**
   - Inti data keuangan: `id`, `title`, `amount`, `type`, `category`, `wallet_id`, `source_wallet_id`, `date`, `is_piutang`, `is_talangan`.
2. **`wallets`**
   - Daftar dompet: `id`, `name`, `type`, `category`, `balance`, `source_wallet_id`.
3. **`debts`**
   - Piutang/utang: `id`, `person_name`, `amount`, `status`, `original_transaction_id`, `payment_transaction_id`.
4. **`budgets`**
   - Anggaran pengeluaran: `id`, `category`, `amount`, `start_date`, `end_date`.
5. **`goals`**
   - Target tabungan: `id`, `name`, `target_amount`, `current_amount`, `deadline`.
6. **`recurring_bills`** & **`bill_payments`**
   - Tagihan rutin: detail tagihan (bills) dan rekam jejak pembayaran (payments per bulan).
7. **`user_settings`**
   - Konfigurasi aplikasi: `id=1` (single user), filter mode, date range, `custom_categories` (JSON).
8. **`filter_history`**
   - Riwayat rentang tanggal pencarian kustom.
9. **`calendar_events`**
   - Acara dan pengingat: `id`, `title`, `date`, `type`, `color`.
10. **`notes`**
    - Catatan keuangan: `id`, `title`, `content`.

---

## 🧩 State Management & Pola Kode

### 1. "Fat Dashboard" (`app/page.tsx`)
Aplikasi ini menggunakan pola *fat dashboard* (komponen induk besar).
- **Semua data utama di-fetch di sini** (transactions, wallets, goals, budgets, debts).
- **State Form Transaksi di-manage di sini**: State form (`title`, `amount`, dll) berada di komponen induk ini dan di-pass ke `TransactionModal` yang lebih berfokus pada UI (presentation).
- Operasi CRUD penting (seperti `handleSaveTransaction`, `deleteTransaction`) berada di file ini.
- Keuntungan: Memudahkan akses data lintang-fitur (misal, hapus transaksi bisa langsung memanggil `fetchWallets()` untuk merefresh saldo).
- Kelemahan: File ini sangat besar (>1200 baris) dan menjadi single point of complexity.

### 2. Client-Side Rendering (`'use client'`)
Sebagian besar halaman yang interaktif (dashboard, analytics, form transaksi, budgets) menggunakan `'use client'` karena membutuhkan `useState`, `useEffect`, dan interaksi DOM (seperti Modal atau Kamera).

### 3. Modals sebagai Page Wrapper (Mobile) vs Modal (Desktop)
Komponen seperti `TransactionModal` dirancang adaptif:
- Di layar **desktop**, ia berfungsi sebagai popup `div` (Modal).
- Di layar **mobile**, seringkali fitur navigasi diarahkan ke halaman penuh (`/transaction`), yang mana *wrapper* pagenya akan meng-import `TransactionModal` dengan pengaturan tertentu.

### 4. Debounced Updates
Digunakan pada perubahan state yang sering (seperti settings date range/mode) untuk meminimalisir write operations ke Supabase.
Lokasi: `app/page.tsx` pada useEffect untuk `filterMode` dan `customRange`.

### 5. Fetch Fresh Database State
Operasi yang mengubah uang secara langsung (seperti transaksi dan hapus wallet) **TIDAK** menggunakan nilai state lokal saat kalkulasi, melainkan melakukan `fetchFreshWalletBalance()` ke Supabase sebelum dieksekusi. Ini adalah strategi **pencegahan race condition**.

---

## 📂 Struktur Direktori

```
my-money/
├── app/
│   ├── api/               # Serverless functions (scan-receipt, holidays)
│   ├── analytics/         # Halaman Analytics
│   ├── budgets/           # Halaman Budgets
│   ├── goals/             # Halaman Goals
│   ├── notes/             # Halaman Notes
│   ├── scan-receipt/      # Halaman AI OCR Scan
│   ├── settings/          # Halaman Settings
│   ├── transaction/       # Wrapper Mobile Form Transaksi
│   ├── wallet/            # Wrapper Mobile Form Wallet
│   ├── wallets/           # Halaman Dompet Aktif
│   ├── main-savings/      # Halaman Tabungan Inti
│   ├── layout.tsx         # Root Layout (Sidebar, Provider)
│   └── page.tsx           # 🏠 DASHBOARD UTAMA
├── components/
│   ├── AddBillModal.tsx
│   ├── CalendarCard.tsx
│   ├── FinancialChart.tsx
│   ├── RecurringBillsList.tsx
│   ├── TransactionModal.tsx
│   ├── WalletModal.tsx
│   └── ... (UI Components lainnya)
├── hooks/
│   ├── useConfirm.tsx     # Custom Hook Dialog Konfirmasi
│   ├── useToast.tsx       # Custom Hook Toast Notifikasi
│   └── useTheme.tsx       # Custom Hook Dark Mode
├── lib/
│   ├── supabase.ts        # Client Supabase Instance
│   └── recurring-bills.ts # Helper Logic Tagihan
├── types/
│   └── index.ts           # Definisi Type/Interface Global
└── docs/                  # Dokumentasi Teknis Internal
```

---

## 🔒 KODE SENSITIF & POLA WAJIB

1. **Transaction Integrity**: Operasi update/delete transaksi yang berdampak pada tabel lain (seperti debts, wallets) wajib dibungkus dalam blok sekuensial yang aman. Lihat `01-TRANSAKSI.md` untuk perincian `handleSaveTransaction` dan `deleteTransaction`.
2. **Single User Design**: Semua operasi terkait pengaturan user melakukan fetch dan update secara spesifik pada `id=1` (karena aplikasi ini dirancang perorangan, tanpa auth multi-tenant).
3. **Timezone Handling**: Untuk insert DB berbasis tanggal (Date), pattern `const safeDate = new Date(customDate + 'T12:00:00').toISOString()` wajib digunakan agar tanggal tidak shift ke hari sebelumnya akibat perbedaan zona waktu (WIB ke UTC).
