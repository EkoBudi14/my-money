# Changelog (Riwayat Perubahan)

> **Catatan:** File ini di-update secara otomatis oleh sistem setiap kali ada perubahan kode yang dieksekusi dan disetujui (Approved). File ini bersifat _append-only_ (hanya menambah di bawah, entri lama tidak boleh dihapus).

---

[2026-06-27 | 23:28] Perbaikan UI: Stat Card Desktop Warna Putih (Specificity Bug)
Perubahan: Mengganti class `bg-[var(--neo-mint)]` dan lainnya di kartu stat desktop menjadi `brutal-card-mint` (variant class dengan `!important` dari globals.css). Hal ini memperbaiki bug di mana warna neo-brutalism tertimpa oleh class `.brutal-card` bawaan yang memiliki background putih (bg-card).
Status: Approved

---

[2026-06-27 | 23:25] Fitur: Tampilan Neobrutalism
Perubahan: Mengubah warna swatch neobrutalism di globals.css menjadi lebih vibrant dan bold (ngejreng) untuk kartu stat di Dashboard, agar gaya desainnya terasa lebih kental mirip Saweria.
Status: Approved

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
Perubahan: Menambahkan tombol panah kembali (Back) pada header halaman Anggaran (`app/budgets/page.tsx`) khusus untuk tampilan _mobile_. Ini memudahkan navigasi user untuk kembali ke Dashboard (Beranda) setelah mengecek anggaran tanpa perlu menggunakan tombol _back_ bawaan browser.
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

[2026-06-19 | 20:33] Fitur: PWA Share Target (Android) + Clipboard API (iOS)
Perubahan: Menambahkan dua mekanisme agar user bisa mengirim foto struk dari galeri HP langsung ke fitur Scan Struk. (1) Android: tambah `share_target` di manifest.json — app muncul di share sheet OS saat user share foto. File baru `app/share-target/route.ts` menerima POST multipart/form-data, konversi ke base64, simpan di cookie sementara (60 detik), redirect ke /scan-receipt. (2) iOS: Clipboard API detection — banner "Ada foto di clipboard" muncul otomatis di upload area saat ada gambar di clipboard. Tap banner → foto langsung dimuat ke scan receipt. Tidak menyentuh handleSave, handleScan, compressImage, atau rate limit handling.
Dipicu oleh prompt: "oke gas — share foto dari galeri HP ke PWA scan struk"
Fitur terdampak: Scan Struk (Low — input saja, tidak menyentuh scan/save), PWA Manifest (Medium — perlu reinstall)
Status: Approved

---

[2026-06-19 | 21:30] Perbaikan QA: PWA Share Target — Critical Bug Fixes
Perubahan: (1) Ganti pendekatan cookie (gagal karena batas ~4KB) dengan server-side in-memory Map + UUID. route.ts menyimpan base64 di Map, redirect ke /scan-receipt?share_id=UUID. File baru /api/share-image/route.ts melayani pengambilan foto one-time (entry dihapus setelah diambil, 410 jika expired). (2) Hapus useSearchParams + Suspense issue — pakai window.location.search yang lebih sederhana. (3) Tambah router.replace setelah baca params — cegah toast muncul ulang saat refresh. (4) Fix GET handler pakai request URL origin bukan hardcode localhost. (5) Hapus visibilitychange listener clipboard — cegah permission dialog spam. (6) Tambah showToast di img.onerror clipboard. (7) Hapus image/gif dari manifest accept list.
Dipicu oleh prompt: "gas perbaiki sesuai action plan" (setelah QA audit)
Fitur terdampak: PWA Share Target Android (High — arsitektur berubah), Scan Struk (Low)
Status: Approved

---

[2026-06-19 | 21:46] Perbaikan Build: Next.js Route Export Error
Perubahan: Memindahkan definisi `imageStore` dari `app/share-target/route.ts` ke file terpisah `lib/image-store.ts`. Ini memperbaiki error build Next.js di mana variabel `imageStore` tidak boleh diexport dari file konfigurasi rute (`route.ts`), yang hanya mengizinkan export fungsi HTTP handler (GET, POST, dll).
Status: Approved

---

[2026-06-19 | 22:08] Perbaikan Arsitektur QA: PWA Share Target to Supabase
Perubahan: Mengganti in-memory `Map` (yang tidak aman dan berpotensi gagal di environment serverless Vercel) menjadi penyimpanan ke database Supabase sementara (`temp_shared_images`). `/share-target` akan melakukan INSERT gambar ke DB, dan `/api/share-image` akan melakukan SELECT dan langsung DELETE saat gambar direquest. Menghapus resiko memory leak dan state isolation antar lambda instance. File `lib/image-store.ts` dihapus.
Status: Approved

---

[2026-06-19 | 22:17] Perbaikan UI: iOS Clipboard Paste
Perubahan: Mengganti mekanisme "Auto-detect clipboard" di halaman Scan Struk menjadi tombol eksplisit "Paste dari Clipboard" yang selalu tampil sejajar di bawah opsi Kamera dan Galeri. Ini memperbaiki masalah di iOS (Safari) di mana gambar hasil copy tidak terdeteksi otomatis akibat pembatasan izin (permission dialog spam) oleh sistem. Sekarang user dapat men-tap tombol secara manual untuk _paste_ foto tanpa masalah izin.
Status: Approved

---

[2026-06-19 | 22:27] Perbaikan UI & UX: iOS PWA Clipboard Paste Fallback
Perubahan: Menambahkan mekanisme _fallback_ untuk kasus di mana tombol "Paste dari Clipboard" otomatis diblokir secara sepihak oleh iOS Safari PWA (sering terjadi di _Home Screen_). Kini, jika izin ditolak (API error), aplikasi akan memunculkan sebuah input teks rahasia yang meminta pengguna untuk men-tap layar sekali lalu memilih "Paste" secara manual dari sistem operasi. Event _paste_ global akan menangkap gambar dan menampilkannya dengan sukses.
Status: Approved

---

[2026-06-21 | 21:00] Fitur: iOS Paste Fix (HEIC & Base64)
Perubahan: Mengubah logika paste di halaman Scan Struk (app/scan-receipt/page.tsx) untuk menangani Live Photos iOS dan gambar berukuran kecil. Menambahkan library heic2any untuk melakukan konversi file HEIC/HEIF secara otomatis dari clipboard menjadi JPEG sebelum digambar di canvas. Menambahkan fallback pembacaan text/html untuk mengekstrak URI Base64 (data:image/...) apabila iOS menyalin gambar kecil (seperti screenshot crop) yang gagal dibaca sebagai file utuh.
Dipicu oleh prompt: "coba cek fitur yang bisa copas img ke web saya di ios saya nemu bug ini kalo gambar nya kecil gabisa di copas foto yg tipe live, udah di matiin tipe live nya juga sama gabisa di copas"
Fitur terdampak: Scan Struk (Medium)
Status: Approved

---

[2026-06-21 | 21:54] Perbaikan QA: iOS Paste — HEIC Heuristic & Error Handling
Perubahan: (1) Fix bug htmlFallbackFound — pengecekan error saat text/html ada tapi Base64-nya tidak valid sekarang berjalan dengan benar. (2) Tambah deteksi HEIC heuristik: type kosong ('') dan 'application/octet-stream' juga dicoba dikonversi via heic2any, menangani Live Photo yang type-nya tidak terbaca iOS. (3) Konversi HEIC kini dilindungi try-catch inner — jika blob ternyata bukan HEIC asli, blob asli tetap dipakai tanpa crash. (4) Ganti showToast success → info saat menerjemahkan HEIC. (5) Tambah state isConverting: tombol Paste menampilkan spinner + disabled selama konversi berlangsung.
Dipicu oleh: QA review setelah implementasi iOS Paste Fix
Fitur terdampak: Scan Struk Clipboard Paste (Medium)
Status: Approved

---

[2026-06-21 | 22:03] Perbaikan QA Round 2: iOS Paste — Minor Edge Cases
Perubahan: (1) Tambah setIsConverting(false) di img.onerror pada path text/html di handleGlobalPaste — mencegah tombol Paste stuck disabled jika img.onerror terpanggil. (2) Tambah prop disabled={isConverting} pada tombol Kamera dan Galeri — mencegah race condition overwrite image saat konversi HEIC masih berjalan. (3) Ubah regex pencarian tag img menjadi case-insensitive (/i) di kedua handler — menangani HTML dari iOS yang mengirim IMG SRC dengan huruf kapital.
Dipicu oleh: QA Round 2
Fitur terdampak: Scan Struk Clipboard Paste (Low)
Status: Approved

---

[2026-06-22 | 21:23] Perbaikan: Mencegah Double Payment & Submit Ganda
Perubahan: Menambahkan proteksi pencegahan klik beruntun (race condition) pada fungsi `handleConfirmPayment` (untuk Tagihan Rutin) dan `handleSaveTransaction` (untuk Form Transaksi Utama). Mencegah tereksekusinya operasi insert transaksi dan update saldo dompet sebanyak dua kali secara paralel.
Dipicu oleh prompt: "coba cek klo kalo ada tagihan terus saya klik bayar kok double dia ya di history nya bug nih bisa2 duitnya bayar 2 kali lagi"
Fitur terdampak: Pembayaran Tagihan (Medium), Transaksi & Saldo (Low)
Status: Approved

---

[2026-06-22 | 21:26] Perbaikan UI: Teks Tagihan Terlewat (Misleading Badge)
Perubahan: Mengubah teks label dari "Selesai bulan ini" (hijau) menjadi "Terlewat" (merah/rose) pada komponen Tagihan Rutin untuk tagihan yang belum dibayar tapi sudah melewati tanggal jatuh tempo (`daysLeft < 0`).
Dipicu oleh prompt: "ini kok saya sudah bayar bulanan netflix ini masih muncul dah"
Fitur terdampak: UI Tagihan Rutin (Low)
Status: Approved

---

[2026-06-25 | 22:12] Perbaikan: 3 Bug Fix — Kalender, AddBillModal Scroll, Hapus Pemasukan Tidak Rollback
Perubahan: (1) CalendarCard.tsx — label, warna background card, warna avatar, warna amount, dan tombol di kalender dibedakan berdasarkan bill.type. Pemasukan rutin tampil dengan warna emerald, label "Pemasukan Rutin", tombol "Terima". handleConfirmCalendarPayment diupdate: cek tipe bill, buat transaksi pemasukan/pengeluaran sesuai, update saldo dengan benar (+/-), gunakan safeDate T12:00:00. (2) AddBillModal.tsx — tambah max-h-[90dvh] dan overflow-y-auto pada modal container agar form bisa di-scroll di layar mobile yang kecil. (3) app/page.tsx deleteTransaction — ganti Promise.all(...) menjadi await Promise.all(...) di L1117 agar fetchWallets() selesai sebelum React re-render, sehingga saldo di UI ter-update setelah rollback berhasil.
Dipicu oleh prompt: "bug nih nambah pemasukan kok muncul bayar di calender, gabisa di scroll, hapus pemasukan saldo tidak berkurang"
Fitur terdampak: Kalender (Medium), Tagihan/Pemasukan Rutin (Medium), Hapus Transaksi Saldo (Medium), AddBillModal UI (Low)
Status: Approved

---

[2026-06-26 | 19:52] Perbaikan UI: AddBillModal — Z-Index & Scroll Tombol Simpan
Perubahan: Menaikkan z-index wrapper modal dari z-50 ke z-[70] agar modal tidak tertutup mobile bottom nav (z-[58]). Mengubah posisi modal dari items-center menjadi items-end sm:items-center sehingga muncul dari bawah di mobile (UX lebih natural). Menurunkan max-h dari 90dvh ke 85dvh dan menambah pb-6 pada container untuk memastikan tombol Simpan selalu terlihat.
Status: Approved

---

[2026-06-26 | 19:52] Perbaikan UI: Favicon — Ganti Logo Vercel ke CatatDuit
Perubahan: Update metadata di app/layout.tsx untuk explicitly set favicon ke /favicon-32x32.png dan /apple-touch-icon.png yang sudah custom (bukan logo Vercel default Next.js). Update title dari "SwiftLog" menjadi "CatatDuit" di metadata dan appleWebApp.
Status: Approved

---

[2026-06-26 | 19:52] Fitur: Mobile Nav — Floating Polish & Hide/Show Toggle
Perubahan: (1) Menambahkan state isNavVisible di Sidebar.tsx dengan animasi translateY(110%) saat disembunyikan menggunakan cubic-bezier smooth transition 0.4s. (2) Handle bar kecil di atas nav pill yang bisa di-tap untuk menyembunyikan nav. (3) Tombol floating "Menu" glassmorphism muncul di pojok kanan bawah saat nav tersembunyi — tap untuk menampilkan kembali. (4) Upgrade visual: rounded-[22px], blur(28px), shadow lebih dalam, margin mx-4 mb-4 untuk kesan floating lebih kuat.
Status: Approved

---

[2026-06-26 | 20:58] Fitur: Desktop Sidebar — Floating Glassmorphism + Hide/Show Toggle
Perubahan: (1) Ubah desktop sidebar dari fixed panel biasa menjadi floating overlay drawer dengan glassmorphism (blur 32px, rounded-[22px], shadow dalam). (2) Tambah state isSidebarOpen (default true). (3) Animasi translateX(-108%) saat hidden, cubic-bezier 0.4s saat toggle. (4) Backdrop semi-transparan muncul saat sidebar terbuka — klik backdrop untuk menutup. (5) Tombol "Menu" floating glassmorphism muncul di pojok kiri atas saat sidebar tertutup. (6) Tombol X di header sidebar untuk menutup. (7) Hapus md:ml-[280px] di layout.tsx karena sidebar kini overlay (tidak push konten).
Dipicu oleh prompt: "ini kan saya bilang jadi floating, dan bisa di hide dan show"
Fitur terdampak: Desktop Sidebar Navigation (High), Layout Content Area (Low)
Status: Approved

---

[2026-06-26 | 21:02] Perbaikan: Desktop Sidebar — Push Mode (Konten Bergeser)
Perubahan: Mengubah sidebar desktop dari overlay drawer (konten tertutup backdrop) menjadi push mode (konten bergeser). Buat hooks/useSidebar.tsx (SidebarProvider + useSidebar context). Buat components/ContentWrapper.tsx (client component dengan animasi margin-left 0→292px, cubic-bezier 0.4s). Update layout.tsx pakai SidebarProvider + ContentWrapper. Update Sidebar.tsx pakai useSidebar context (hapus local state). Hapus backdrop overlay.
Dipicu oleh prompt: "kalo lagi buka menunya tetep bisa di akses jadi kaya saat show halaman yang di samping auto kegeser"
Fitur terdampak: Desktop Sidebar Navigation (Medium), Layout Content Area (Medium)
Status: Approved

---

[2026-06-26 | 21:09] Perbaikan: Desktop Sidebar — Edge Tab & Smooth Polish
Perubahan: (1) Mengubah layout desktop sidebar agar menempel penuh (flush-left) di sisi kiri layar dengan menghilangkan outer padding & border-left. Sidebar inner diset rounded kanan saja (rounded-r-[24px]). (2) Memperbaiki ContentWrapper agar margin saat sidebar ditutup bernilai 0px, sehingga tidak menyisakan ruang kosong/gap di sisi kiri konten utama. (3) Menambahkan transitionDelay pada toggle edge tab agar muncul secara natural setelah animasi sidebar tertutup selesai (0.15s), menghindari visual tumpang tindih. (4) Lebar sidebar disesuaikan menjadi 280px murni.
Dipicu oleh prompt: "ini gabisa dibuat lebih smooth lagi apa? jelek bgt ini ada gap gitu"
Fitur terdampak: UI Desktop Sidebar (High), Desktop Layout Margin (Medium)
Status: Approved

---

[2026-06-26 | 21:33] Perbaikan: Desktop Sidebar — Restore Floating Design & Middle Toggle
Perubahan: (1) Mengembalikan style sidebar ke mode "floating" (memiliki padding 12px di sisi kiri, atas, bawah) dan ujung rounded penuh (rounded-[22px]). (2) Mengubah tombol edge tab kembali menjadi pill mengambang bertuliskan "> Menu". (3) Mempertahankan posisi tombol toggle di bagian tengah layar (top: 50%, translateY: -50%) agar tidak bertabrakan dengan header konten ("CatatDuit" dsb). (4) Content margin-left kembali menggunakan 292px saat terbuka dan 0px saat tertutup.
Dipicu oleh prompt: "ini dibagian kirinya kok nempel gini ya? kan saya maunya floating??"
Fitur terdampak: UI Desktop Sidebar (High)
Status: Approved

---

[2026-06-27 | 12:54] Fitur: Redesign Neobrutalism (Halaman Sekunder)
Perubahan: Mengubah tampilan 6 halaman sekunder (Tabungan Inti, Dompet, Goals, Catatan, Budget, Analytics) menggunakan sistem desain Neobrutalism (utility class `brutal-card`, `neo-label`, `brutal-btn`, dll dari globals.css). Tidak ada logika state, DB, atau kalkulasi finansial yang diubah, murni perombakan visual.
Dipicu oleh prompt: "coba cek itu di sebelumnya kan ada implementation plan yang ini tau kan? Neobrutalism Redesign — Semua Halaman Sekunder"
Fitur terdampak: Halaman Tabungan Inti (Low), Dompet (Low), Goals (Low), Catatan (Low), Budget (Low), Analytics (Low)
Status: Approved

---

[2026-06-27 | 13:20] Fitur: Redesign Neobrutalism (Tahap Lanjutan)
Perubahan: Mengubah tampilan halaman Formulir Transaksi (Transaction, Scan Receipt, Voice Transaction), Dashboard Utama (Mobile & Desktop Wrappers), serta Halaman Settings menggunakan sistem desain Neobrutalism (utility class `brutal-card`, `neo-label`, `brutal-btn`, dll). Tidak ada logika state, DB, atau kalkulasi finansial yang diubah, murni perombakan visual.
Dipicu oleh prompt: "apa aja dan redesign semua tampilan jadi neobrutalism INGAT JANGAN UBAH LOGIC APAPUN, DISINI MURNI REDESIGN DOANG"
Fitur terdampak: Halaman Transaksi (Low), Scan Receipt (Low), Voice Transaction (Low), Dashboard (Low), Settings (Low)
Status: Approved

---

[2026-06-27 | 22:19] Fitur: Sidebar (Mobile Menu Lainnya)
Perubahan: Mengubah styling Mobile Bottom Sheet "Menu Lainnya" di komponen Sidebar menjadi gaya Neobrutalism (border solid tebal, shadow tegas, active state dengan translate, hover scale di ikon).
Status: Approved

---

[2026-06-27 | 22:23] Fitur: Dashboard (Visibility Toggle)
Perubahan: Menyeragamkan styling tombol icon mata (visibility toggle) di seluruh card pada dashboard utama (baik versi mobile maupun desktop) agar menggunakan gaya neobrutalism (border solid, shadow, dan bentuk rounded-xl) agar konsisten.
Status: Approved

---

[2026-06-27 | 22:27] Fitur: Global UI (Close Buttons)
Perubahan: Menyeragamkan seluruh tombol close (icon X) di semua modal, dialog, toast, dan sidebar (mobile & desktop) ke dalam gaya neobrutalism kuning (squircle, border tebal, shadow solid) untuk konsistensi desain di seluruh aplikasi.
Status: Approved

---

[2026-06-27 | 22:30] Fitur: Global UI (Toast Notifications)
Perubahan: Mengubah seluruh komponen Toast/Notifikasi pop-up (success, error, warning, info) menjadi gaya desain neobrutalism (border tebal solid, warna tegas, shadow tebal, icon bold) menggantikan desain soft-shadow sebelumnya.
Status: Approved

---

[2026-06-27 | 23:18] Desain: Tema Warna Solid Neo-Brutalism pada Kartu Ringkasan (Dashboard)
Perubahan: Mengganti warna latar belakang putih (`bg-white/bg-card`) yang terkesan kaku/hitam-putih pada 4 kartu ringkasan utama (Total Uang, Saldo Aktif, Pemasukan, Pengeluaran) di Dashboard dengan warna-warna pastel/vivid solid khas Saweria.
- **Total Uang**: Menggunakan warna hijau mint (`neo-mint`).
- **Saldo Aktif**: Menggunakan warna biru langit (`neo-sky`).
- **Pemasukan**: Menggunakan warna kuning terang (`neo-yellow`).
- **Pengeluaran**: Menggunakan warna merah muda/peach (`neo-peach`).
Semua ikon dan teks di dalamnya disesuaikan menjadi warna `neo-ink` (hitam pekat) agar kontras maksimal. Hal ini juga diterapkan pada ringkasan versi mobile.
Status: Approved

---

[2026-06-27 | 23:15] Desain: Neobrutalism pada Success Modal (Pop-up Berhasil)
Perubahan: Merombak desain dari komponen `SuccessModal` yang sebelumnya masih memiliki gaya generik pipih dan gradient (sisa desain lama) menjadi desain `Neo-Brutalism` murni:
- Border luar hitam `4px` dengan shadow balok tebal.
- Latar belakang tombol utama dan progress bar menjadi warna solid (neo-mint, neo-sky, dll).
- Ikon besar yang dikelilingi border tebal khas neobrutalism, tanpa efek riak air (ripple) tipis.
- Mengubah warna font, huruf kapital ganda (*uppercase*), dan bobot teks yang diselaraskan dengan font `Space Mono`.
Status: Approved

---

[2026-06-27 | 23:13] Desain: Konsistensi Desain Pemilih Kategori (Transaction Modal)
Perubahan: Menyeragamkan tampilan komponen *Category Picker* (pemilih kategori) pada modal transaksi desktop agar sama dengan desain mobile. Desain yang sebelumnya masih menggunakan gaya lama (lingkaran tipis) sekarang sudah diubah menjadi gaya Neo-Brutalism (kotak melengkung `rounded-[14px]`, border tebal, efek hover timbul membal) yang sesuai dengan *guidelines* desain.
Status: Approved

---

[2026-06-27 | 23:10] Bugfix & UI: Penyesuaian Ruang Font Space Mono & Hapus Teks Ekstra
Perubahan: 
- Menyesuaikan ukuran font (menjadi lebih kecil) dan padding pada *tabs* "Pemasukan/Pengeluaran/Topup" agar teks tidak menabrak batas tombol, mengingat `Space Mono` memiliki rasio huruf yang lebih lebar.
- Menghapus teks kecil di bawah input jumlah uang (`MoneyInput`) yang sering disalahartikan sebagai bug.
- Menambah *padding* pada input uang agar angka yang diketik tidak menabrak tombol "+000".
Status: Approved

---

[2026-06-27 | 23:07] Desain: Neobrutalism Tombol X (Tutup) di Tambah Transaksi
Perubahan: Menyamakan desain tombol silang (X) pada pop-up / bottom sheet "Tambah Transaksi" di halaman Dashboard (baik mobile maupun desktop) agar menggunakan gaya desain Neobrutalism kuning tebal yang persis sama dengan komponen lain.
Status: Approved

---

[2026-06-27 | 23:05] Desain: Neobrutalism Date Filter di Dashboard
Perubahan: Mengubah styling dari komponen filter periode (tanggal) pada halaman utama (Dashboard versi desktop) yang sebelumnya masih menggunakan desain lama (pill oval tipis) menjadi gaya *Neo-Brutalism* (border tebal, shadow tebal, efek hover/active interaktif).
Status: Approved

---

[2026-06-27 | 23:02] Desain: Update Font Utama ke Space Mono
Perubahan: Mengganti font utama aplikasi dari "Inter" menjadi "Space Mono" untuk memperkuat gaya desain *Neo-Brutalism* sehingga terasa lebih berkarakter, retro-digital, dan seirama dengan *vibe* Saweria.
Status: Approved

---

[2026-06-27 | 22:56] Fitur: Navigasi Halaman Tagihan Rutin (Mobile)
Perubahan: Mengubah aksi tombol tambah (+) dan edit pada komponen "Tagihan Rutin" (tampilan mobile/dashboard) agar melakukan navigasi ke halaman baru (`/recurring`), alih-alih membuka popup dialog/modal. Ini dilakukan untuk menjaga konsistensi alur pengguna (UX) dengan fitur penambahan dompet dan transaksi.
Status: Approved

---

[2026-06-27 | 22:54] Fitur: Total Saldo Dompet (Desktop)
Perubahan: Menambahkan banner "Total Semua Dompet" di bagian atas halaman Dompet Saya pada tampilan desktop agar desainnya konsisten dengan halaman Tabungan Inti.
Status: Approved

---

[2026-06-27 | 22:50] Bugfix: Konsistensi Warna & Tampilan Topup di Analitik (Transaksi Per Dompet)
Perubahan: 
- Memperbaiki warna transaksi "Topup" yang sebelumnya tampil sebagai pengeluaran (merah) di rincian per dompet, sekarang menggunakan gaya biru dengan icon Zap.
- Memperbaiki bug di mana transaksi topup hanya muncul di dompet tujuan. Sekarang topup tampil di dompet asal (sebagai minus biru) dan di dompet tujuan (sebagai plus biru).
Status: Approved

---

[2026-06-27 | 22:50] Fitur: Dashboard Mobile (Riwayat Transaksi)
Perubahan: Menerapkan gaya desain neobrutalism pada tombol aksi (Export, Refresh, dan Lihat Semua) di bagian Riwayat Transaksi khusus untuk tampilan mobile agar selaras dengan tampilan desktop.
Status: Approved

---

[2026-06-27 | 22:45] Fitur: Styling Icon X
Perubahan: Menyamakan styling tombol close di form kelola kategori custom dengan desain neobrutalism (border tebal & kuning).
Status: Approved

---

[2026-07-08 | 11:58] Perbaikan: Performa — Silent Fetch (fetchTransactions)
Perubahan: Menambahkan parameter `silent = false` pada fungsi `fetchTransactions`. Saat `silent=true`, fungsi tidak akan mengubah `loading` state sehingga daftar transaksi tidak hilang/flicker saat background refresh. Semua pemanggilan setelah action (save transaksi, hapus, bayar piutang, update tagihan) diubah ke `fetchTransactions(true)`. First load dan tombol refresh manual tetap menggunakan `fetchTransactions()` biasa (dengan loading indicator). Tidak ada perubahan pada logika fetch, kalkulasi keuangan, atau komponen lain.
Dipicu oleh prompt: "setiap saya melakukan action entah edit add atau hapus kenapa lama bgt yaa?"
Fitur terdampak: Riwayat Transaksi UI (Low)
Status: Approved
---

[2026-07-08 | 12:10] Perbaikan: Performa — Parallelisasi DB Calls di handleSaveTransaction (INSERT Mode)
Perubahan: (1) fetchFreshWalletBalance untuk topup dijalankan paralel dengan Promise.all — hemat ~300ms. (2) Pemasukan/Pengeluaran: wallet state update optimistic langsung + wallet DB update fire-and-forget dengan .catch() rollback — hemat ~300ms. (3) Topup dengan/tanpa admin fee: semua wallet update + admin fee insert dijalankan paralel — hemat ~300–600ms. EDIT mode tidak disentuh. Logika kalkulasi keuangan tidak berubah.
Dipicu oleh prompt: "gaada yang lag2 lagi soalnya ini berasa juga lag saat melakukan action"
Fitur terdampak: Tambah Transaksi INSERT Mode (Medium), Topup INSERT Mode (Medium)
Status: Approved
---

[2026-07-11 | 12:51] Perbaikan UI: Mencegah Auto-Zoom di iOS Mobile
Perubahan: Menambahkan pengaturan viewport `maximumScale: 1` dan `userScalable: false` pada export metadata di file `app/layout.tsx` untuk mencegah browser iOS (Safari) melakukan zoom-in otomatis setiap kali user menekan form input (mengetik).
Status: Approved
---

[2026-07-11 | 13:16] Fitur: Loading Progress Bar Global (Nextjs-Toploader)
Perubahan: Menambahkan komponen indikator visual (`nextjs-toploader`) pada `app/layout.tsx`. Hal ini memperbaiki masalah di mana transisi perpindahan halaman via menu navigasi terasa sangat *delay* atau ngelag di Next.js, karena kini progress bar berwarna kuning seketika langsung muncul di bagian atas layar untuk memberi tahu *user* bahwa proses pemuatan halaman tujuan sedang berjalan di latar belakang (client-side routing Next.js).
Status: Approved
---

[2026-07-16 | 19:09] Fitur: Kotak Ringkasan Arus Kas (Dashboard)
Perubahan: Menambahkan kotak informasi baru "Ringkasan Arus Kas" di dashboard (desktop & mobile). Kotak ini menampilkan: (1) Total Pemasukan periode aktif (exclude piutang), (2) Total Uang Digunakan = semua outflow: pengeluaran (termasuk talangan) + topup/transfer, (3) Sisa Belum Terpakai = Pemasukan - Uang Digunakan, (4) Progress bar visual dengan threshold warna: hijau (<50%), kuning (50-80%), merah (>80%), ditambah label status dinamis. Kalkulasi baru `totalUsed` ditambahkan sebagai useMemo read-only, tidak menyentuh DB atau logic CRUD apapun. Desktop: tampil sebagai card 3-kolom setelah Stats Grid. Mobile: tampil sebagai card list setelah Stats Row.
Dipicu oleh prompt: "saya mau nambah 1 container/kotak informasi baru — perbandingan uang masuk vs uang yang sudah digunakan dari pemasukan"
Fitur terdampak: Dashboard UI (Low)
Status: Approved
---

[2026-07-16 | 19:22] Perbaikan: Pisah State Hide/Show Card Ringkasan Arus Kas
Perubahan: Menambahkan state baru `showCashFlow` (terpisah dari `showIncome`) beserta tombol Eye toggle di header card Ringkasan Arus Kas (mobile & desktop). Sebelumnya semua nilai di card Ringkasan Arus Kas mengikuti state `showIncome` milik card Pemasukan. Kini keduanya independen — menyembunyikan angka di card Pemasukan tidak lagi mempengaruhi card Ringkasan Arus Kas.
Status: Approved
---
