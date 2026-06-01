# Changelog (Riwayat Perubahan)

> **Catatan:** File ini di-update secara otomatis oleh sistem setiap kali ada perubahan kode yang dieksekusi dan disetujui (Approved). File ini bersifat *append-only* (hanya menambah di bawah, entri lama tidak boleh dihapus).

---

[2026-05-27 | 22:32] Fitur: Recurring Income (Pemasukan Rutin)
Perubahan: Extend fitur Tagihan Rutin menjadi "Rutin Bulanan" yang mendukung dua tipe: Tagihan (pengeluaran) dan Pemasukan Rutin (gaji, tunjangan, dll). Tambah field `type` di interface RecurringBill dan kolom DB. Update AddBillModal dengan toggle tipe + kategori dinamis. Update RecurringBillsList dengan tab Tagihan/Pemasukan, logika "Bayar" vs "Terima", saldo wallet bertambah untuk pemasukan & berkurang untuk tagihan.
Dipicu oleh prompt: "gas fitur ini ya — Recurring Income"
Fitur terdampak: Tagihan Rutin (Medium), Wallet Balance (Medium), Transaksi (Low)
Status: Approved
---


[2026-05-25 | 19:32] Fitur: Dompet (UI Mobile)
Perubahan: Menyelaraskan layout tombol Edit & Hapus di tampilan mobile agar sejajar mendatar, sama seperti di Tabungan.
Status: Approved
---

[2026-05-25 | 20:58] Fitur: Export Excel — Sheet "Rekap per Rentang"
Perubahan: Filter baris ambigu/trivial sebelum render sheet: skip rentang start == end (hasil debounce setengah jalan) + dedup key start|end. Update kondisi grand total row pakai cleanHistory.length.
Status: Approved
---

[2026-05-25 | 21:12] Fitur: Export Excel — Sheet "Rekap per Rentang"
Perubahan: Upgrade filter dari skip start==end menjadi skip rentang < 3 hari (MIN_DURATION_MS = 2 hari selisih). Mencegah semua entri sampah debounce secara permanen, bukan hanya kasus start==end.
Status: Approved
---

[2026-05-25 | 21:21] Fitur: Settings Sync — filter_history save guard
Perubahan: Tambah guard durasi minimum sebelum upsert ke tabel filter_history. Rentang custom < 3 hari tidak akan tersimpan ke DB sama sekali. Fix akar masalah entri sampah debounce.
Dipicu oleh prompt: "lanjut fix"
Fitur terdampak: Export Excel Sheet Rekap per Rentang (Low), Quick-select filter history (Low)
Status: Approved
---

[2026-05-26 | 12:01] Fitur: Edit & Hapus Transaksi — Optimasi Performa
Perubahan: (1) Optimistic update di deleteTransaction — transaksi langsung hilang dari UI saat user konfirmasi hapus, tanpa menunggu semua DB call selesai. Rollback otomatis jika DB gagal. (2) Optimistic update di handleSaveTransaction — state lokal diupdate dengan data[0] dari DB response, menggantikan full fetchTransactions(). (3) Parallelkan fetchWallets + fetchDebts menggunakan Promise.all(). Kalkulasi saldo dan logika keuangan tidak berubah.
Dipicu oleh prompt: "perbaiki ini saya ngerasa kok kalo edit dan hapus transaksi kaya lama banget ya loadingnya"
Fitur terdampak: Edit Transaksi (Medium), Hapus Transaksi (Medium), Daftar Transaksi (Low)
Status: Approved
---

[2026-05-26 | 12:18] Fitur: Edit & Hapus Transaksi — Optimasi Performa Tahap 2
Perubahan: Mengganti pemanggilan fetch yang berurutan (sequential) menjadi parallel (Promise.all) pada fungsi markDebtAsPaid dan handleBillsUpdate untuk mempercepat loading state setelah data berhasil disimpan.
Dipicu oleh prompt: "ini udah mencakup semua edit sama delete di semua fitur?"
Fitur terdampak: Pembayaran Piutang (Low), Update Tagihan Rutin (Low)
Status: Approved
---

[2026-05-26 | 12:24] Fitur: Goals & Budget — Optimasi Performa Tahap 3
Perubahan: Implementasi Optimistic Update pada fungsi Hapus Target Tabungan (Goals) dan Hapus Budget. Item langsung hilang dari UI saat dihapus, tanpa menunggu response DB. Rollback otomatis jika DB gagal.
Dipicu oleh prompt: "perbaiki gapapa optimistic update juga deh"
Fitur terdampak: Hapus Goals (Low), Hapus Budget (Low)
Status: Approved
---

[2026-05-26 | 12:35] Fitur: Edit Transaksi — Perbaikan Bug Topup & Biaya Admin
Perubahan: (1) Memperbaiki bug di mana field "Biaya Admin" selalu kosong saat menekan tombol Edit pada transaksi Topup (mengambil nominal dari history lokal). (2) Menambahkan kembali `fetchTransactions()` ke background sync setelah save, agar transaksi "Biaya Admin" yang baru terbuat/terupdate bisa langsung muncul di riwayat transaksi tanpa harus refresh halaman (efek samping dari optimistic update sebelumnya).
Dipicu oleh prompt: "bisa perbaiki, ini saya top upda ada admin seribu tapi pas update kok tetep jadi 60.000, mustinya 61.000 kan di history coba cek?"
Fitur terdampak: Edit Transaksi Topup (Medium), Riwayat Transaksi (Medium)
Status: Approved
---

[2026-05-27 | 19:22] Fitur: Budget — Progress Bar Warna (Bug Fix #1)
Perubahan: Ganti class Tailwind tidak valid `bg-rose-50 dark:bg-rose-950/300` dan `bg-orange-50 dark:bg-orange-950/300` (nilai /300 tidak ada di Tailwind) menjadi `bg-rose-500` dan `bg-orange-400`. Berlaku di mobile view (L529) dan desktop view (L637). Progress bar over-budget dan hampir-over-budget kini tampil merah/oranye dengan benar.
Dipicu oleh prompt: "fix bug dulu - Budget progress bar warna salah"
Fitur terdampak: Budget Progress Bar Mobile (Medium), Budget Progress Bar Desktop (Medium)
Status: Approved
---

[2026-05-27 | 19:22] Fitur: Budget Quick Expense — Timezone Bug Fix (#3)
Perubahan: Ganti `date: new Date().toISOString()` menjadi pola `T12:00:00` yang konsisten dengan `handleSaveTransaction` di dashboard. Sekarang Quick Expense tidak akan tercatat di hari yang salah akibat selisih timezone WIB vs UTC di malam hari.
Dipicu oleh prompt: "fix bug dulu - Quick Expense timezone bug"
Fitur terdampak: Budget Quick Expense (Medium), Riwayat Transaksi (Low)
Status: Approved
---

[2026-05-27 | 19:22] Fitur: Analytics — Filter Sync Real-time (Bug Fix #4)
Perubahan: Tambah `window.addEventListener('focus', handleFocus)` di Analytics page. Setiap kali user kembali ke tab/halaman Analytics, settings filter (mode & custom range) di-refetch dari Supabase agar selalu sinkron dengan perubahan yang dilakukan di Dashboard. Listener dibersihkan saat komponen unmount (cleanup).
Dipicu oleh prompt: "fix bug dulu - Filter Analytics tidak real-time sinkron dengan Dashboard"
Fitur terdampak: Analytics Filter (Medium), Settings Sync (Low)
Status: Approved
---

[2026-06-01 | 09:23] Fitur: Voice Transaction Input (Baru)
Perubahan: Tambah fitur input transaksi via suara menggunakan Web Speech API + Gemini AI. User bicara → AI parsing teks → muncul hasil review (bisa diedit) → konfirmasi → masuk history. File baru: app/api/voice-transaction/route.ts (Gemini AI endpoint), app/voice-transaction/page.tsx (halaman UI). Sidebar diupdate dengan menu "Voice Input".
Dipicu oleh prompt: "tambah fitur baru yaitu user nantinya speaking kira2 pengeluaran apa atau pemasukannya apa nantinya akan muncul hasilnya dan kemudian setelah muncul hasil nya konfirm baru masuk history"
Fitur terdampak: Transaksi/DB Insert (Medium), Sidebar Navigation (Low)
Status: Approved
---

[2026-06-01 | 10:48] Fitur: Voice Transaction Input (Fix Brave Browser)
Perubahan: Migrasi dari Web Speech API (diblokir oleh Brave) ke MediaRecorder API. Audio direkam (maks 15s), dikirim via Base64 ke backend, dan diproses secara native menggunakan fitur multimodal Gemini 1.5 Flash untuk ekstraksi JSON + Transkripsi sekaligus.
Dipicu oleh prompt: "coba cek ini fiturnya kok saya klik mic gabis amasih error nih / disini saya pakai brave browser"
Fitur terdampak: Voice Transaction Frontend & Backend API (Tinggi)
Status: Approved
---

[2026-06-01 | 11:05] Fitur: Voice Input Multi-Transaksi
Perubahan: Merombak prompt Gemini API untuk menghasilkan array JSON, memungkinkan pengguna menyebutkan beberapa transaksi sekaligus (contoh: "Beli kopi 25 ribu dan bayar tol 15 ribu") dalam sekali rekam (15 detik). UI diperbarui untuk menampilkan *multiple cards* dan mendukung *batch insert* ke database.
Dipicu oleh prompt: "gas bikin multi transaksi"
Fitur terdampak: Voice Transaction Frontend, API Endpoint & Supabase Transaction Insert
Status: Approved
---

[2026-06-01 | 11:24] Fitur: Voice Transaction — Minor Fix
Perubahan: Hapus import Wand2 yang tidak terpakai, tambah kotak transkripsi "Yang AI Dengar" di halaman Review agar user bisa verifikasi hasil tangkapan suara AI.
Status: Approved
---

[2026-06-01 | 11:29] Fitur: Voice Transaction — Penggabungan Transaksi (Keyword)
Perubahan: Menambahkan aturan pada prompt Gemini untuk menggabungkan beberapa transaksi menjadi 1 transaksi (menjumlahkan nominalnya) jika mendeteksi kata kunci seperti "gabung", "totalin", "sekalian", dll.
Dipicu oleh prompt: "kalo ada kata2 di gabung itu berarti dalam 1 kali saya bicara transaksinya di gabung"
Fitur terdampak: Voice Transaction Backend (Prompt Gemini)
Status: Approved
---
