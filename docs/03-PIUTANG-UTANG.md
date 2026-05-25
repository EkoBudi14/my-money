# 03 — Fitur Piutang & Utang (Debts)

## 📌 Ringkasan
Fitur piutang mengelola uang yang **dipinjamkan ke orang lain** melalui mekanisme **Split Bill** atau **Talangan**. Saat piutang dilunasi, otomatis dibuat transaksi pemasukan dan saldo wallet diperbarui.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/page.tsx` (L126-L134, L838-L1233) | State debts, split bill, pelunasan, delete |
| `components/TransactionModal.tsx` | UI form split bill & talangan dalam modal transaksi |
| `types/index.ts` — `Debt` | Interface data piutang |

---

## 🔄 Alur Kerja

### A. Membuat Piutang (via Split Bill)
**Trigger**: Saat menambah transaksi **pengeluaran** dengan toggle "Split Bill" aktif.

**Lokasi**: `app/page.tsx` — L838-L852

Alur:
1. User menambah transaksi pengeluaran
2. User mengaktifkan toggle "Split Bill"
3. User mengisi nama & jumlah per orang di `splitEntries`
4. Saat transaksi disimpan:
   - Transaksi pengeluaran di-insert (total pengeluaran)
   - Untuk setiap entry yang valid → insert ke tabel `debts` dengan:
     - `person_name`: nama orang
     - `amount`: jumlah hutang
     - `status: 'pending'`
     - `original_transaction_id`: ID transaksi pengeluaran

### B. Pelunasan Piutang
**Lokasi**: `app/page.tsx` — `markDebtAsPaid()` (L1162-L1212)

Alur:
1. User pilih piutang yang akan dilunasi
2. User pilih wallet tujuan untuk menerima uang
3. Sistem:
   - **Insert transaksi pemasukan** otomatis:
     - `title: 'Pelunasan Piutang: {nama}'`
     - `is_piutang: true`
     - `piutang_person: {nama}`
   - **Update status debt** → `'paid'` + simpan `payment_wallet_id` & `payment_transaction_id`
   - **Update saldo wallet** (fresh balance + amount)

### C. Hapus Piutang
**Lokasi**: `app/page.tsx` — `deleteDebt()` (L1214-L1233)

- Hapus data piutang dari tabel `debts`
- **Tidak mengubah** saldo wallet atau transaksi terkait

### D. Cascade Delete (dari Transaksi Induk)
**Lokasi**: `app/page.tsx` — `deleteTransaction()` (L966-L1033)

Saat transaksi pengeluaran yang punya split bill dihapus:
1. Cek apakah ada debts terkait
2. Cek apakah ada pembayaran piutang yang sudah tercatat
3. Jika ada pembayaran → rollback saldo wallet per pembayaran
4. Hapus semua debts terkait
5. Hapus transaksi pembayaran terkait
6. Hapus transaksi pengeluaran utama

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Transaksi** | Split bill membuat transaksi pengeluaran + data debts. Pelunasan membuat transaksi pemasukan |
| **Wallet** | Pelunasan piutang menambah saldo wallet. Cascade delete rollback saldo |
| **Analytics** | Transaksi piutang (`is_piutang: true`) **tidak dihitung** sebagai pemasukan nyata. Talangan (`is_talangan: true`) **tidak dihitung** sebagai pengeluaran pribadi |

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. `markDebtAsPaid()` — L1162-L1212
**Alasan**: Membuat transaksi pemasukan otomatis + update saldo wallet + update status debt. Tiga operasi yang harus sinkron.

### 2. Cascade Delete di `deleteTransaction()` — L966-L1033
**Alasan**: Urutan operasi sangat penting:
1. Rollback saldo per payment transaction
2. Delete debts (hapus FK reference dulu)
3. Delete payment transactions
4. Delete transaksi utama

### 3. Split Bill Insert — L838-L852
**Alasan**: Harus dilakukan SETELAH transaksi utama berhasil di-insert (butuh `data[0].id` untuk `original_transaction_id`).

### 4. Filter Piutang/Talangan di Analytics — `app/analytics/page.tsx` L156-L157
```typescript
const inc = filteredTxs.filter(t => t.type === 'pemasukan' && !t.is_piutang)...
const exp = filteredTxs.filter(t => t.type === 'pengeluaran' && !t.is_talangan)...
```
**Alasan**: Logika ini memastikan piutang & talangan tidak mengganggu kalkulasi keuangan riil.

---

## 📐 Interface Data

```typescript
export interface Debt {
    id: number
    person_name: string
    amount: number
    status: 'pending' | 'paid'
    original_transaction_id?: number     // ID transaksi pengeluaran asal
    payment_wallet_id?: number           // Wallet yang menerima pelunasan
    payment_transaction_id?: number      // ID transaksi pemasukan pelunasan
    note?: string
    created_at: string
    paid_at?: string
}
```

---

## 📝 Catatan Penting

1. **Piutang** (`is_piutang: true`) pada transaksi pemasukan — menandai bahwa uang ini sebenarnya adalah pengembalian piutang, bukan pendapatan riil.
2. **Talangan** (`is_talangan: true`) pada transaksi pengeluaran — menandai bahwa pengeluaran ini atas nama orang lain, bukan pengeluaran pribadi.
3. Saat edit transaksi pengeluaran → semua debts terkait **dihapus dan dibuat ulang** (L834).
4. Debt modal (di dashboard) menampilkan daftar piutang pending dengan opsi pilih wallet untuk pelunasan.
