# Changelog (Riwayat Perubahan)

> **Catatan:** File ini di-update secara otomatis oleh sistem setiap kali ada perubahan kode yang dieksekusi dan disetujui (Approved). File ini bersifat *append-only* (hanya menambah di bawah, entri lama tidak boleh dihapus).

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
