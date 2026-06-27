# CatatDuit Neobrutalism Redesign

File `redesign.md` ini sekarang bisa Anda jadikan file utama untuk instruksi redesign.

Kalau Anda ingin memakai satu file saja sebagai pegangan, pakai `redesign.md` ini untuk:

- memahami arah redesign
- tahu file mana yang perlu dibuka
- tahu file mana yang perlu di-copy ke project
- memberi instruksi ke Antigravity atau AI lain
- menjelaskan hubungan antara prototype, design system, dan starter code

Paket ini saya susun dari audit situs live `my-money-sandy.vercel.app`, lalu saya turunkan menjadi prototype, design system, dan starter code yang bisa Anda copy ke project Next.js.

## Pakai file ini seperti apa

Kalau Anda ingin yang paling sederhana, anggap pembagiannya seperti ini:

- `redesign.md`
  File utama untuk membaca instruksi, arah desain, dan langkah implementasi.
- `prototype.html`
  File visual yang dibuka di browser untuk melihat contoh tampilannya.
- `styles.css`
  File styling global yang dipakai sebagai fondasi tampilan.
- `design-tokens.ts`
  File token warna, radius, shadow, dan spacing.
- `page-templates.tsx`
  File template halaman yang dipakai sebagai contoh implementasi.

Jadi, kalau pertanyaannya adalah:

### Apakah cukup pakai `redesign.md` saja

Jawabannya: `ya, untuk instruksi utama`.

Tapi untuk melihat contoh visual yang benar-benar bisa dibuka, Anda tetap perlu membuka `prototype.html`.

Cara paling pas memakainya:

1. Baca `redesign.md`
2. Buka `prototype.html`
3. Copy file code yang dibutuhkan ke project
4. Pakai prompt di `redesign.md` kalau mau eksekusi via Antigravity

## Yang dibuka dan yang di-copy

Supaya tidak bingung, ini pemisahannya:

### File yang dibuka untuk dilihat

- `redesign.md`
- `prototype.html`

### File yang di-copy ke project

- `styles.css`
- `design-tokens.ts`
- `components/ui/brutal-button.tsx`
- `components/ui/brutal-card.tsx`
- `components/ui/brutal-input.tsx`
- `components/layout/app-shell.tsx`
- bagian yang relevan dari `page-templates.tsx`

### File yang tidak perlu dijadikan runtime langsung

- `redesign.md`
  Ini untuk panduan, bukan file aplikasi.
- `prototype.html`
  Ini untuk contoh visual, bukan route produksi.

## Jika Anda mau pakai ini sebagai instruksi tunggal

Kalau nanti Anda kirim ke Antigravity atau ke orang lain, Anda bisa bilang begini:

> Ikuti `redesign.md` sebagai dokumen utama redesign. Gunakan `prototype.html` sebagai acuan visual, `styles.css` dan `design-tokens.ts` sebagai fondasi style, lalu terapkan struktur halaman dari `page-templates.tsx` ke route Next.js yang sesuai.

## Tujuan redesign

Redesign ini tetap memakai karakter neobrutalism, tapi dibuat lebih nyaman dilihat lama-lama:

- warna tetap tegas, tapi tidak terlalu menyala terus-menerus
- radius besar dan shadow tebal dipakai konsisten agar playful, bukan berantakan
- informasi finansial diprioritaskan dengan hierarki yang lebih tenang
- desktop dan mobile memakai bahasa visual yang sama
- semua menu utama dirancang ulang, bukan hanya dashboard

## Halaman yang dicakup

Berdasarkan audit situs live, menu utamanya adalah:

- `Dashboard`
- `Analitik`
- `Dompet`
- `Tabungan Inti`
- `Budget`
- `Goals`
- `Catatan`
- `Form Transaksi` untuk `Pemasukan`, `Pengeluaran`, `Transfer`
- `Scan Struk`
- `Voice Input`

## Isi folder

- `prototype.html`
  Prototype visual statis untuk desktop dan mobile.
- `styles.css`
  Versi awal design system neobrutalism yang lebih nyaman.
- `design-tokens.ts`
  Token warna, radius, shadow, dan spacing untuk Next.js/Tailwind.
- `components/ui/brutal-button.tsx`
- `components/ui/brutal-card.tsx`
- `components/ui/brutal-input.tsx`
- `components/layout/app-shell.tsx`
- `page-templates.tsx`
  Template semua halaman utama dalam satu file agar mudah dipecah ke route asli.

## Cara membaca paket ini

Kalau Anda membuka folder redesign ini, urutannya sebaiknya:

1. `redesign.md`
   Baca dulu supaya paham struktur paket.
2. `prototype.html`
   Lihat dulu arah visual desktop dan mobile.
3. `styles.css`
   Pahami fondasi global design system.
4. `design-tokens.ts`
   Lihat token utama yang menjaga konsistensi.
5. `page-templates.tsx`
   Ambil pola implementasi halaman yang Anda perlukan.

## Kesimpulan cepat

Kalau Anda ingin ringkas:

- `redesign.md` adalah pusat instruksi
- `prototype.html` adalah pusat contoh visual
- file `tsx`, `css`, dan `ts` adalah pusat implementasi

Jadi `redesign.md` bisa dipakai sebagai file utama, tetapi bukan satu-satunya file yang perlu dibuka bila Anda ingin melihat prototype-nya secara visual.

## Karakter desain

### Visual direction

- Background utama: warm off-white agar mata tidak cepat lelah
- Permukaan kartu: putih, butter yellow, mint, sky, peach
- Border: hitam pekat agar identitas neobrutalism tetap terasa
- Shadow: tebal tapi rapi, tidak terlalu blur
- Typography: sans yang tegas untuk heading, sans normal untuk isi
- Ikon dan chip: besar, jelas, tidak terlalu kecil

### UX direction

- Sidebar desktop dibuat seperti command center
- Mobile memakai `bottom navigation` + `floating primary action`
- Dashboard difokuskan ke `saldo aktif`, `aksi cepat`, `cashflow`, `transaksi terbaru`
- Halaman analitik dibuat lebih modular dengan blok insight yang mudah dipindai
- Form transaksi dibuat lebih singkat, besar, dan thumb-friendly
- Fitur AI seperti `Scan Struk` dan `Voice Input` diposisikan sebagai tool cepat, bukan halaman kosong

## Rekomendasi mapping komponen

### Shared

- `AppShell`
- `BrutalCard`
- `BrutalButton`
- `BrutalInput`
- `StatCard`
- `SectionHeader`
- `Pill`
- `MobileBottomNav`

### Dashboard

- `HeroSummary`
- `QuickActions`
- `BalanceSplit`
- `CashflowChartCard`
- `TransactionFeed`
- `BillsCard`
- `CalendarCard`
- `MarketWidgets`

### Analitik

- `InsightBanner`
- `ComparisonTable`
- `CategoryBreakdown`
- `WalletFlowList`

### Dompet dan tabungan

- `WalletStack`
- `AllocationMeter`
- `SavingAssetCard`

### Input pages

- `TransactionModeTabs`
- `AmountPad`
- `WalletSelect`
- `CategoryChips`
- `MicRecorderCard`
- `ReceiptDropzone`

## Cara pakai di Next.js

1. Copy isi `styles.css` ke `app/globals.css` atau gabungkan ke file global Anda.
2. Copy komponen pada folder `components`.
3. Gunakan `page-templates.tsx` sebagai sumber contoh halaman, lalu pecah menjadi route asli:
   - `app/page.tsx`
   - `app/analytics/page.tsx`
   - `app/wallets/page.tsx`
   - `app/main-savings/page.tsx`
   - `app/budgets/page.tsx`
   - `app/goals/page.tsx`
   - `app/notes/page.tsx`
   - `app/transaction/page.tsx`
   - `app/scan-receipt/page.tsx`
   - `app/voice-transaction/page.tsx`
4. Copy `design-tokens.ts` bila Anda ingin token warna dan shadow tetap konsisten.
5. Map data Anda ke props komponen.
6. Pertahankan token warna dan spacing supaya semua halaman konsisten.

## Kalau mau cepat copy ke project

Kalau Anda hanya ingin tahu apa yang perlu dipindah ke project, copy ini:

```txt
styles.css
design-tokens.ts
components/ui/brutal-button.tsx
components/ui/brutal-card.tsx
components/ui/brutal-input.tsx
components/layout/app-shell.tsx
page-templates.tsx
```

Lalu:

- gabungkan `styles.css` ke `app/globals.css`
- pindahkan folder `components` ke project Anda
- pecah isi `page-templates.tsx` sesuai route asli project Anda

## Kalau mau cepat kasih instruksi ke Antigravity

Kalau Anda tidak mau menjelaskan panjang lebar, cukup kasih instruksi seperti ini:

```md
Gunakan `redesign.md` sebagai dokumen utama.
Gunakan `prototype.html` sebagai acuan visual desktop dan mobile.
Gunakan `styles.css` dan `design-tokens.ts` sebagai fondasi design system.
Gunakan `page-templates.tsx` dan folder `components` sebagai starter code Next.js untuk implementasi redesign semua halaman.
```

## Struktur implementasi yang saya sarankan

```txt
app/
  page.tsx
  analytics/page.tsx
  wallets/page.tsx
  main-savings/page.tsx
  budgets/page.tsx
  goals/page.tsx
  notes/page.tsx
  transaction/page.tsx
  scan-receipt/page.tsx
  voice-transaction/page.tsx
components/
  ui/
  layout/
  dashboard/
  analytics/
```

## Prioritas eksekusi

1. Terapkan token dan komponen dasar.
2. Ubah layout desktop dan mobile shell.
3. Redesign dashboard.
4. Redesign form transaksi.
5. Redesign analitik, dompet, tabungan.
6. Rapikan budget, goals, catatan, scan struk, voice input.

## Prompt siap pakai untuk Antigravity

Anda bisa copy prompt ini:

```md
Redesign project CatatDuit menjadi neobrutalism yang lebih nyaman dilihat lama-lama.

Gunakan referensi style dari folder redesign yang saya lampirkan:

- pertahankan border hitam tebal, shadow offset, dan kartu playful
- gunakan palet hangat dan lebih tenang: cream, butter, mint, sky, peach
- fokus pada readability dan kenyamanan scanning data finansial
- desktop: sidebar tebal + content grid modular
- mobile: bottom nav, sticky quick action, card stack yang enak di-scroll

Route yang harus di-redesign:

- /
- /analytics
- /wallets
- /main-savings
- /budgets
- /goals
- /notes
- /transaction
- /scan-receipt
- /voice-transaction

Rules:

- gunakan Next.js App Router
- gunakan Tailwind CSS
- buat komponen reusable
- hindari gradient berlebihan
- pastikan semua state form besar dan mudah disentuh di mobile
- buat hierarchy visual yang kuat untuk nominal uang, CTA, dan status
- style harus konsisten dengan token pada design system

Referensi file:

- redesign.md
- prototype.html
- styles.css
- design-tokens.ts
- page-templates.tsx
```

## Catatan penting

- Prototype ini belum terhubung ke data asli, jadi sifatnya UI starter.
- Karena source code project Anda belum ada di folder kerja ini, saya buat paket yang siap ditempel ke project Next.js Anda.
- Jika nanti Anda upload repo aslinya, saya bisa lanjutkan sampai level implementasi langsung ke file produksi.
