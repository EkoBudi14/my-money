# 06 — Fitur Tagihan Rutin (Recurring Bills)

## 📌 Ringkasan
Fitur tagihan rutin mengelola tagihan berkala bulanan (listrik, internet, dll). Setiap tagihan memiliki tanggal jatuh tempo dan bisa dibayar langsung dari dashboard. Pembayaran otomatis membuat transaksi pengeluaran dan mengupdate saldo wallet.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `lib/recurring-bills.ts` | Logic CRUD untuk tagihan rutin (database operations) |
| `components/RecurringBillsList.tsx` | Komponen UI daftar tagihan + status pembayaran |
| `components/AddBillModal.tsx` | Modal form tambah tagihan baru |
| `types/index.ts` — `RecurringBill`, `BillPayment` | Interface data |
| `app/page.tsx` | Dashboard — integrasi RecurringBillsList, trigger refresh |

---

## ⚙️ Logic Detail

### A. Tambah Tagihan
**Lokasi**: `components/AddBillModal.tsx` + `lib/recurring-bills.ts`

Fields:
- `name`: Nama tagihan
- `amount`: Jumlah tagihan
- `due_date`: Tanggal jatuh tempo (1-31)
- `category`: Kategori pengeluaran

### B. Status Pembayaran
**Lokasi**: `components/RecurringBillsList.tsx`

Status ditentukan per bulan melalui tabel `bill_payments`:
- **Belum Dibayar**: Tidak ada record `bill_payments` untuk bulan ini
- **Sudah Dibayar**: Ada record `bill_payments` untuk bulan ini

### C. Pembayaran Tagihan
**Lokasi**: `components/RecurringBillsList.tsx`

Alur:
1. User klik "Bayar" pada tagihan
2. Pilih wallet sumber
3. Cek saldo wallet cukup
4. **Insert transaksi pengeluaran**:
   - `title`: nama tagihan
   - `amount`: jumlah tagihan
   - `category`: kategori tagihan
   - `wallet_id`: wallet yang dipilih
5. **Update saldo wallet**: `balance - amount`
6. **Insert record `bill_payments`**:
   - `bill_id`: ID tagihan
   - `month`: format YYYY-MM
   - `transaction_id`: ID transaksi yang baru dibuat

### D. Interaksi dengan Delete Transaksi
**Lokasi**: `app/page.tsx` — `deleteTransaction()` (L1096-L1158)

Saat transaksi pembayaran tagihan dihapus:
1. Hapus record `bill_payments` yang terkait (`transaction_id`)
2. **Fallback**: Jika tidak ada link langsung, coba cari berdasarkan `bill.name` == `transaction.title` + bulan yang sama
3. Trigger refresh `RecurringBillsList` via `billsUpdateTrigger`

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Transaksi** | Pembayaran tagihan membuat transaksi pengeluaran |
| **Wallet** | Pembayaran mengurangi saldo wallet |
| **Dashboard** | RecurringBillsList ditampilkan di dashboard, direfresh via `billsUpdateTrigger` |
| **Delete Transaksi** | Delete transaksi pembayaran → reset status tagihan ke "belum dibayar" |

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. Pembayaran Logic di `RecurringBillsList.tsx`
**Alasan**: Insert transaksi + update saldo + insert bill_payment. Tiga operasi yang harus sinkron.

### 2. Fallback Delete di `app/page.tsx` — L1109-L1146
**Alasan**: Fallback detection untuk legacy bill payments yang tidak punya `transaction_id`. Mencari berdasarkan nama tagihan + bulan. Menghapus ini bisa menyebabkan status tagihan tidak reset saat transaksi dihapus.

### 3. `billsUpdateTrigger` State — `app/page.tsx`
**Alasan**: Mekanisme refresh yang dipakai oleh RecurringBillsList. Setiap perubahan yang mempengaruhi tagihan harus increment trigger ini.

---

## 📐 Interface Data

```typescript
export interface RecurringBill {
    id: number
    name: string
    amount: number
    due_date: number      // 1-31 (tanggal jatuh tempo)
    category: string
    created_at?: string
}

export interface BillPayment {
    id: number
    bill_id: number
    month: string          // YYYY-MM
    paid_at: string
    transaction_id?: number // Link ke transaksi pembayaran
    created_at: string
}
```

---

## 📝 Catatan Penting

1. Pembayaran tagihan **langsung mengupdate saldo wallet** tanpa melalui `handleSaveTransaction()` dari dashboard. Ini jalur CRUD terpisah.
2. `billsUpdateTrigger` di-increment setiap kali ada perubahan yang bisa mempengaruhi status tagihan (pembayaran, delete transaksi, save custom category).
3. Fallback detection saat delete transaksi bisa menghapus `bill_payments` yang salah jika ada tagihan dengan nama yang sama. Ini edge case yang perlu diperhatikan.
