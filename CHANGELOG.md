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
