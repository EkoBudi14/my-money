# 📚 My-Money — Dokumentasi Teknis Per Fitur

## Daftar Dokumentasi

| No | File | Fitur | Deskripsi Singkat |
|----|------|-------|-------------------|
| 01 | [01-TRANSAKSI.md](./01-TRANSAKSI.md) | Transaksi | CRUD transaksi (pemasukan, pengeluaran, topup), kalkulasi saldo, piutang, talangan, split bill, admin fee |
| 02 | [02-WALLET.md](./02-WALLET.md) | Dompet (Wallet) | Manajemen dompet aktif & tabungan inti, refund saldo, cascade delete |
| 03 | [03-PIUTANG-UTANG.md](./03-PIUTANG-UTANG.md) | Piutang & Utang (Debts) | Split bill, pencatatan piutang, pelunasan otomatis, cascade delete |
| 04 | [04-BUDGET.md](./04-BUDGET.md) | Manajemen Budget | CRUD budget per kategori, progress tracking, quick expense |
| 05 | [05-GOALS.md](./05-GOALS.md) | Target Tabungan (Goals) | CRUD goals, quick add savings, progress tracking |
| 06 | [06-RECURRING-BILLS.md](./06-RECURRING-BILLS.md) | Tagihan Rutin | CRUD tagihan rutin, pembayaran otomatis, status tracking |
| 07 | [07-ANALYTICS.md](./07-ANALYTICS.md) | Analitik | Chart, insights, perbandingan periode, pencarian transaksi |
| 08 | [08-KATEGORI-KUSTOM.md](./08-KATEGORI-KUSTOM.md) | Kategori Kustom | CRUD kategori pengeluaran/pemasukan custom dengan icon & warna |
| 09 | [09-SCAN-RECEIPT.md](./09-SCAN-RECEIPT.md) | Scan Struk (AI) | OCR via AI, parsing struk/transfer/tagihan, penyimpanan otomatis |
| 10 | [10-NOTES.md](./10-NOTES.md) | Catatan Keuangan | CRUD notes, preview di dashboard |
| 11 | [11-SETTINGS-FILTER.md](./11-SETTINGS-FILTER.md) | Pengaturan & Filter | Dark mode, filter bulanan/custom, sync settings ke Supabase |
| 12 | [12-CALENDAR.md](./12-CALENDAR.md) | Kalender & Event | Kalender keuangan, event custom, integrasi hari libur |
| 13 | [13-ARCHITECTURE.md](./13-ARCHITECTURE.md) | Arsitektur & Infrastruktur | Tech stack, state management, tabel Supabase, pola kode |

---

## Aturan Pengembangan

> ⚠️ **PENTING**: Aturan ini wajib diikuti setiap kali ada perubahan kode.

1. **Fokus pada scope permintaan** — Jangan sentuh fitur/logic lain yang tidak relevan.
2. **Konfirmasi sebelum ubah** — Jika ada bagian di luar scope yang perlu diubah, sampaikan temuan dan tunggu persetujuan.
3. **Tunjukkan bagian yang diubah** — Bukan seluruh file.
4. **Jangan refactor/rename/restructure** kecuali diminta eksplisit.
5. **Baca bagian `🔒 KODE SENSITIF`** di setiap dokumentasi fitur sebelum melakukan perubahan.
