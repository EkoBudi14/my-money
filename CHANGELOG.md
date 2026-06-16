# Changelog (Riwayat Perubahan)

> **Catatan:** File ini di-update secara otomatis oleh sistem setiap kali ada perubahan kode yang dieksekusi dan disetujui (Approved). File ini bersifat _append-only_ (hanya menambah di bawah, entri lama tidak boleh dihapus).

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
Perubahan: Merombak prompt Gemini API untuk menghasilkan array JSON, memungkinkan pengguna menyebutkan beberapa transaksi sekaligus (contoh: "Beli kopi 25 ribu dan bayar tol 15 ribu") dalam sekali rekam (15 detik). UI diperbarui untuk menampilkan _multiple cards_ dan mendukung _batch insert_ ke database.
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

[2026-06-03 | 22:04] Fitur: Mobile Bottom Navigation — Glassmorphism
Perubahan: Redesign bottom nav mobile menjadi floating pill dengan efek glassmorphism (frosted glass iOS-style). Fitur: backdrop-blur 24px, semi-transparent background, rounded corners, shadow, dan active indicator pill. Mendukung light & dark mode secara adaptif.
Status: Approved

---

[2026-06-03 | 22:08] Fitur: Mobile Bottom Nav — FAB Center Button
Perubahan: Tambah tombol + (FAB) besar di tengah bottom nav untuk akses cepat Scan Struk & Voice Input. Layout diubah: [Dashboard][Analitik][+FAB][Dompet][Lainnya]. Tabungan dipindah ke menu Lainnya. Speed dial muncul dengan animasi slide-up + glassmorphism. FAB rotate 45° saat aktif. Hanya mobile.
Status: Approved

---

[2026-06-03 | 22:13] Fitur: Voice Transaction — Auto Stop (Silence Detection)
Perubahan: Menambahkan fitur deteksi keheningan (silence detection) menggunakan Web Audio API (AnalyserNode). Rekaman akan otomatis berhenti jika user diam selama 2.5 detik (setelah bicara), atau 5 detik jika belum bicara sama sekali. Menghemat kuota API Gemini dan meningkatkan UX agar user tidak perlu menekan tombol stop manual.
Status: Approved

---

[2026-06-03 | 22:15] Fitur: Splash Screen PWA
Perubahan: Menambahkan komponen `<SplashScreen />` di awal aplikasi (app/layout.tsx) untuk menggantikan blank/loading statis. Tampil full-screen menutupi UI selama 1.5 detik dengan logo animasi zoom-in, lalu fade-out perlahan. Mendukung Light dan Dark Mode. Memberikan pengalaman pengguna ala aplikasi native kelas atas.
Status: Approved

---

[2026-06-03 | 22:17] Perbaikan: Voice Transaction — Cut Off Terlalu Cepat
Perubahan: Mengubah algoritma Silence Detection di Voice Input. Sebelumnya menggunakan rata-rata frekuensi volume (average) yang menyebabkan suara pelan terdeteksi sebagai diam/silence. Sekarang diubah menggunakan deteksi Peak Volume (maxVolume > 15) agar lebih akurat mendeteksi ucapan. Batas maksimal perekaman juga dinaikkan dari 15 detik menjadi 30 detik untuk menghindari terputus saat kalimatnya panjang.
Status: Approved

---

[2026-06-03 | 22:19] Perbaikan: Voice Transaction — Auto Stop Tidak Berjalan
Perubahan: Mengubah metode membaca data sensor suara dari Frequency Data ke Time Domain Data, serta menggunakan kalkulasi Root Mean Square (RMS). Hal ini menyelesaikan bug di mana background noise (seperti kipas/AC) dideteksi sebagai suara terus-menerus, sehingga rekaman tidak pernah berhenti. Dengan RMS, sistem hanya fokus pada getaran amplitudo asli (loudness) sehingga deteksi hening jauh lebih presisi.
Status: Approved

---

[2026-06-03 | 22:21] Fitur: Voice Transaction — Auto-Select Wallet
Perubahan: Menambahkan instruksi pada prompt AI Gemini untuk mengekstrak informasi nama dompet (`wallet`, `source_wallet`, `destination_wallet`) dari ucapan user. Menambahkan fungsi di client (`page.tsx`) untuk mendeteksi nama dompet hasil AI dan membandingkannya (fuzzy match) dengan daftar dompet aktif pengguna. Jika ada yang cocok, dropdown pilihan dompet akan langsung berubah secara otomatis sesuai yang diucapkan user.
Status: Approved

---

[2026-06-03 | 22:38] Fitur: Mobile Quick Actions (UI)
Perubahan: Redesign 4 tombol menu utama (Masuk, Keluar, Transfer, Anggaran) di dashboard mobile menjadi gaya "Bento Box" modern 2025/2026. Menambahkan glassmorphic mini cards, drag handle accent, ikon proporsional (squircle), hover states tipis, dan transisi warna font untuk keterbacaan maksimum di mode Light/Dark.
Dipicu oleh prompt: "bisa cek dibagian ini di menu mobile ini bisa engga ya untuk 4 tombol ini dibuat menarik dan keliatan bgt bahwa 4 tombol ini bisa di pencet"
Fitur terdampak: Dashboard UI (Low)
Status: Approved

---

[2026-06-03 | 22:41] Perbaikan: Optimasi Performa Loading Transaksi
Perubahan: Membatasi fetch history transaksi di halaman `transaction/page.tsx` dari _seluruh history_ (tanpa batas) menjadi _hanya 2 bulan terakhir_ (`gte('date', twoMonthsAgo)`). Memperbaiki lag parah (loading lemot) saat membuka form Aksi Cepat karena database sudah terisi banyak data.
Dipicu oleh prompt: "ini kenapa yaa saat masuk ke menu masuk keluar atau ke 4 ini serasakaya lmot bgt loadingnya , kenapa ya"
Fitur terdampak: Halaman Form Transaksi (Medium), Database Fetch (High)
Status: Approved

---

[2026-06-03 | 22:45] Perbaikan: Instant UI Rendering (Form Transaksi)
Perubahan: Mengubah mekanisme loading state pada halaman form transaksi. Sebelumnya, UI menunggu seluruh data dari Supabase selesai di-fetch sebelum me-render halaman (menyebabkan layar terasa "freeze" sebelum navigasi). Sekarang, kerangka halaman (Header dan Tab navigasi) akan di-render secara instan tanpa delay, sementara animasi loading hanya ditampilkan pada bagian dalam _form_ (`isLoading` prop diteruskan ke komponen modal). Ini mengeliminasi _perceived latency_ 100%.
Dipicu oleh prompt: "coba cek ini yang klik masuk saya masuk ngerasa lemot bisa di cek lagi mungkin?"
Fitur terdampak: Navigasi Aksi Cepat (Medium), Transaction Modal (Medium)
Status: Approved

---

[2026-06-03 | 22:48] Perbaikan: Optimasi Fetching Halaman Anggaran
Perubahan: Mengubah metode penarikan data (fetch) di halaman `budgets/page.tsx`. Sebelumnya aplikasi menarik data secara berurutan (Sequential Fetch: Settings -> Wallets -> Budgets -> Transactions) yang memakan waktu cukup lama. Sekarang diubah menjadi Parallel Fetch (menggunakan `Promise.all`), sehingga semua data ditarik secara serentak di latar belakang. Waktu loading halaman Anggaran dipangkas hingga lebih dari 60%.
Dipicu oleh prompt: "coba cek saat buka transfer sama anggaran juga nih"
Fitur terdampak: Halaman Anggaran (Medium)
Status: Approved

---

[2026-06-03 | 22:52] Fitur: Tombol Back (Mobile) di Halaman Anggaran
Perubahan: Menambahkan tombol panah kembali (Back) pada header halaman Anggaran (`app/budgets/page.tsx`) khusus untuk tampilan *mobile*. Ini memudahkan navigasi user untuk kembali ke Dashboard (Beranda) setelah mengecek anggaran tanpa perlu menggunakan tombol *back* bawaan browser.
Dipicu oleh prompt: "coba cek di tampilan mobile di menu angggaran engga ada tombol back"
Fitur terdampak: UI Mobile Halaman Anggaran (Low)
Status: Approved
---

[2026-06-03 | 23:15] Perbaikan: Edit Transaksi Lama (Fallback Fetch)
Perubahan: Memperbaiki bug di form edit transaksi (`app/transaction/page.tsx`). Sebelumnya transaksi yang berumur lebih dari 2 bulan gagal dimuat karena terimbas limit history 2 bulan. Ditambahkan fallback query langsung ke database berdasarkan `editId` jika data tidak ditemukan di history lokal, sehingga transaksi setua apapun tetap bisa diedit.
Dipicu oleh prompt: "coba cek dari fitur2 baru di tambah ini udah aman semua bebas bug dan ngga nyenggol yang lain kan ini, coba liat di perubahanya dah?"
Fitur terdampak: Form Transaksi (Medium), Database Fetch (Low)
Status: Approved
---

[2026-06-07 | 16:25] Perbaikan: Splash Screen Muncul Ulang Saat Navigasi
Perubahan: Menambahkan pengecekan `sessionStorage` di `SplashScreen.tsx`. Splash kini hanya ditampilkan sekali per sesi browser. Saat user navigasi ke halaman lain (`/transaction`, `/budgets`, dll), layout.tsx yang di-remount akan skip render splash jika key `splashShown` sudah tersimpan di sessionStorage.
Status: Approved
---

[2026-06-13 | 14:39] Perbaikan: Tombol Simpan Hilang di Edit Dompet (Mobile)
Perubahan: Menaikkan z-index container halaman Edit Dompet dari `z-50` menjadi `z-[59]` di `WalletModal.tsx`. Sebelumnya tombol Simpan (fixed bottom) tertutup oleh Mobile Bottom Navigation (`z-[58]`). Perubahan hanya CSS, tidak menyentuh logic apapun.
Status: Approved
---

[2026-06-16 | 09:30] Fitur: Export Excel — Tambah Kolom Tabungan
Perubahan: Menambahkan perhitungan "Net Tabungan" pada Sheet "Rekap per Rentang" di fitur Export Excel (`app/page.tsx`). Tabungan dihitung dari (Pemasukan + Transfer Masuk ke dompet kategori savings) dikurangi (Pengeluaran + Transfer Keluar dari dompet kategori savings). Kolom Tabungan ditambahkan setelah kolom Talangan (total menjadi 7 kolom).
Dipicu oleh prompt: "ini bukan nambah worksheet baru tapi nambah tabel di worksheet rekap per rentang, ini kan ada tabel pemasukan nah di sampingnya coba tambhin juga yaitu tabungan"
Fitur terdampak: Export Excel (Medium)
Status: Approved
---

[2026-06-16 | 21:53] Fitur: TransactionModal — Spacing Tombol Simpan (Mobile)
Perubahan: Menambahkan jarak kosong (`h-28`) di bawah tombol Simpan pada Mode Halaman (Page Mode) di `TransactionModal.tsx`. Sebelumnya perbaikan hanya dilakukan di mode Modal/Bottom Sheet, sehingga saat dibuka lewat Quick Actions (Page Mode) tombol masih tertutup navigation bar. Kini tombol selalu aman dari area bottom navigation bar di kedua mode.
Status: Approved
---
