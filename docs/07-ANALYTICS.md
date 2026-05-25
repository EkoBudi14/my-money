# 07 — Fitur Analitik

## 📌 Ringkasan
Halaman analitik menyajikan **visualisasi komprehensif** dari data keuangan: income vs expense, breakdown per kategori, breakdown per wallet, perbandingan antar periode, spending insights, dan pencarian transaksi global.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/analytics/page.tsx` | Halaman utama analitik (1401 baris) — semua chart, insights, filter |
| `components/FinancialChart.tsx` | Komponen chart untuk dashboard (bar chart sederhana) |

---

## ⚙️ Fitur Detail

### 1. Income vs Expense Summary
**Lokasi**: `app/analytics/page.tsx` — L155-L167

```typescript
const inc = filteredTxs.filter(t => t.type === 'pemasukan' && !t.is_piutang)...
const exp = filteredTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan)...
```

- **Piutang TIDAK dihitung** sebagai pemasukan
- **Talangan TIDAK dihitung** sebagai pengeluaran
- Net Balance = Income - Expense

### 2. Expense by Category (Pie Chart)
**Lokasi**: L170-L179

- Mengelompokkan pengeluaran per kategori
- Talangan dikecualikan
- Diurutkan dari yang terbesar

### 3. Expense by Wallet
**Lokasi**: L182-L191

- Menggunakan `Map` untuk O(1) wallet name lookup
- Talangan dikecualikan

### 4. Wallet Transaction Breakdown
**Lokasi**: L194-L220

- Mengelompokkan SEMUA transaksi per wallet
- Menampilkan daftar transaksi per wallet
- Sorting: berdasarkan total expense terbesar
- **Bug Fix #6**: Topup tidak dihitung sebagai pengeluaran di breakdown

### 5. Pencarian Transaksi Global
**Lokasi**: L222-L242

- Mencari di **SEMUA transaksi** (tidak terbatas periode)
- Pencarian berdasarkan: `title`, `category`, `wallet name`
- Dibatasi 50 hasil untuk performa
- Diurutkan berdasarkan tanggal terbaru

### 6. Spending Insights
**Lokasi**: L292-L381

Insights otomatis berdasarkan perbandingan dengan periode sebelumnya:

| Insight | Kondisi |
|---------|---------|
| Saving Rate Sehat 🎉 | saving rate >= 20% |
| Saving Rate Rendah ⚠️ | 0 < saving rate < 20% |
| Minus 🚨 | expense > income |
| Top Category 📊 | Kategori dengan pengeluaran terbesar |
| Kategori Naik 📈 | Pengeluaran naik >10% dari periode lalu |
| Kategori Turun 📉 | Pengeluaran turun >10% dari periode lalu |
| Pemasukan Naik 💰 | Income naik >= 5% |
| Pemasukan Turun 💸 | Income turun >= 5% |

Fitur tampilan:
- **Multiplier format**: Jika naik >= 2x, tampilkan "2x lipat" bukan persentase
- **Percentage format**: Untuk kenaikan < 2x

### 7. Period Comparison
**Lokasi**: L384-L442

Perbandingan head-to-head periode saat ini vs periode sebelumnya:
- Summary: Income, Expense, Net, Saving Rate
- Breakdown per kategori: jumlah saat ini vs sebelumnya + diff

### 8. Monthly/Custom Comparison Chart
**Lokasi**: L444-L533

- **Monthly mode**: Bar chart per bulan dalam tahun yang dipilih (sampai bulan sekarang)
- **Custom mode**: Breakdown per month-slice dalam rentang custom

### 9. Filter Sync dengan Dashboard
**Lokasi**: L44-L97

- Filter mode (monthly/custom) disimpan ke **Supabase `user_settings`**
- Custom date range disinkronkan
- **Debounced update** (500ms) untuk mencegah excessive writes

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Transaksi** | Semua data analitik bersumber dari tabel `transactions` |
| **Wallet** | Nama wallet untuk breakdown per wallet |
| **Piutang/Talangan** | Filter `is_piutang` dan `is_talangan` mempengaruhi kalkulasi |
| **Settings** | Filter mode dan custom range disinkronkan via `user_settings` |

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. Filter Piutang/Talangan — L156-L157
```typescript
const inc = filteredTxs.filter(t => t.type === 'pemasukan' && !t.is_piutang)...
const exp = filteredTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan)...
```
**Alasan**: Ini adalah aturan bisnis fundamental — piutang & talangan harus dikecualikan dari kalkulasi keuangan riil. Dipakai di banyak tempat.

### 2. Bug Fix #6 di Wallet Breakdown — L205-L206
```typescript
else if (t.type === 'pengeluaran') grouped[wName].totalExpense += t.amount
```
**Alasan**: Topup sengaja tidak dihitung sebagai pengeluaran di breakdown per wallet.

### 3. Insights Logic — L292-L381
**Alasan**: Logika perbandingan periode yang kompleks dengan banyak threshold. Perubahan bisa mengganggu keakuratan insights.

### 4. Settings Sync — L44-L97
**Alasan**: Sinkronisasi filter dengan Supabase. Pola debounced update yang sama dipakai di dashboard. Perubahan di sini harus di-mirror ke dashboard juga.

---

## 📝 Catatan Penting

1. Analitik menggunakan **`useMemo`** secara ekstensif untuk performa (semua kalkulasi di-memoize).
2. **Scroll reset** saat pertama kali buka halaman analytics (L109-L125) — penting untuk UX mobile.
3. Pencarian transaksi **tidak terbatas periode** — mencari di semua transaksi yang ada.
4. Chart menggunakan **Recharts** library (PieChart, BarChart, ResponsiveContainer).
5. Comparison data di custom mode menggunakan **month-slice** approach yang cukup rumit (L448-L500).
