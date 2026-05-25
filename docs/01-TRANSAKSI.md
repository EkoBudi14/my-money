# 01 — Fitur Transaksi

## 📌 Ringkasan
Fitur transaksi adalah **inti utama** aplikasi. Mengelola pencatatan pemasukan, pengeluaran, dan topup saldo antar dompet. Setiap operasi CRUD transaksi **langsung mempengaruhi saldo dompet** secara otomatis.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/page.tsx` (L114-L1250) | **Pusat logika transaksi** — state, CRUD, kalkulasi saldo |
| `app/transaction/page.tsx` | Halaman form transaksi (mobile full-page) |
| `components/TransactionModal.tsx` | Modal form transaksi (desktop modal + mobile page mode) |
| `types/index.ts` — `Transaction` | Interface data transaksi |
| `lib/supabase.ts` | Koneksi ke database |

---

## 🔄 Tipe Transaksi

### 1. **Pemasukan** (`type: 'pemasukan'`)
- Menambah saldo dompet yang dipilih
- Opsi: tandai sebagai **Piutang** (lihat [03-PIUTANG-UTANG.md](./03-PIUTANG-UTANG.md))
- Kategori: Gaji, Bonus & Hadiah, Investasi, Penjualan, Lainnya + kategori kustom

### 2. **Pengeluaran** (`type: 'pengeluaran'`)
- Mengurangi saldo dompet yang dipilih
- **Cek saldo** sebelum insert — tolak jika tidak cukup
- Opsi: tandai sebagai **Talangan** (pengeluaran atas nama orang lain)
- Opsi: **Split Bill** — buat data piutang otomatis
- Kategori: Kebutuhan Dapur, Makan di Luar, Transportasi, dll + kategori kustom

### 3. **Topup** (`type: 'topup'`)
- Transfer saldo dari **dompet sumber** ke **dompet tujuan**
- Dompet sumber dikurangi, dompet tujuan ditambah
- Opsi: **Biaya Admin** — dipotong tambahan dari dompet sumber
- Sumber dan tujuan **tidak boleh sama**

---

## ⚙️ Logic Detail

### A. Tambah Transaksi (Insert Mode)
**Lokasi**: `app/page.tsx` — `handleSaveTransaction()` (L551-L865)

Alur:
1. Validasi input (judul, amount > 0, kategori, wallet, tanggal)
2. **Fetch saldo fresh** dari DB via `fetchFreshWalletBalance()` (anti race condition)
3. Cek saldo cukup (untuk pengeluaran & topup)
4. Buat `payload` dengan timezone-safe date (`T12:00:00`)
5. Insert ke tabel `transactions`
6. Update saldo wallet:
   - Pemasukan/Topup: `saldo + amount`
   - Pengeluaran: `saldo - amount`
7. Jika Topup:
   - Source wallet: `saldo - amount - adminFee`
   - Jika ada admin fee → insert transaksi "Biaya Admin" terpisah
8. Jika Split Bill → insert data `debts` (lihat [03-PIUTANG-UTANG.md](./03-PIUTANG-UTANG.md))

### B. Edit Transaksi (Update Mode)
**Lokasi**: `app/page.tsx` — `handleSaveTransaction()` (L615-L827)

Alur:
1. Fetch transaksi lama dari DB
2. **Deteksi apakah wallet sama atau berubah**
3. **Wallet sama** (L657-L712):
   - Rollback saldo → apply ulang dengan nilai baru
   - Jika topup lama punya "Biaya Admin" → hapus & rollback
   - Apply admin fee baru jika ada
4. **Wallet berbeda** (L713-L784):
   - Rollback saldo wallet lama sepenuhnya
   - Apply transaksi baru ke wallet baru
   - Handle topup: rollback source lama, apply source baru
5. Hapus & recreate data debts jika ada perubahan split bill

### C. Hapus Transaksi
**Lokasi**: `app/page.tsx` — `deleteTransaction()` (L927-L1161)

Alur:
1. Konfirmasi hapus
2. Cek apakah transaksi ini adalah **pembayaran piutang** (`payment_transaction_id`)
   - Jika ya → revert status debt ke `pending`
3. Cek apakah transaksi ini **membuat piutang** (`original_transaction_id`)
   - Jika ya → konfirmasi kedua + cascade delete debts & payment transactions
4. Hapus transaksi dari DB
5. **Rollback saldo** (fetch fresh dari DB):
   - Pemasukan/Topup: `saldo - amount`
   - Pengeluaran: `saldo + amount`
6. Jika Topup → rollback source wallet + hapus "Biaya Admin" terkait
7. Cek & hapus `bill_payments` terkait (untuk reset status tagihan rutin)

### D. Timezone-Safe Date
**Lokasi**: `app/page.tsx` — L595

```typescript
// Fix Bug #9: Pakai T12:00:00 agar tidak shift 1 hari di WIB (UTC+7)
const safeDate = new Date(`${customDate}T12:00:00`).toISOString()
```

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Wallet** | Setiap transaksi CRUD langsung update saldo wallet |
| **Piutang/Utang** | Split bill membuat data `debts`, pelunasan membuat transaksi pemasukan |
| **Budget** | Pengeluaran dihitung terhadap budget per kategori |
| **Analytics** | Semua transaksi menjadi sumber data analitik |
| **Recurring Bills** | Pembayaran tagihan membuat transaksi + update `bill_payments` |
| **Scan Receipt** | Scan struk membuat transaksi baru |

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. `handleSaveTransaction()` — L551-L865
**Alasan**: Logika kalkulasi saldo sangat kompleks dengan banyak edge case:
- Race condition prevention via `fetchFreshWalletBalance()`
- Rollback saldo saat edit (wallet sama vs berbeda)
- Admin fee handling untuk topup
- Cascade update ke debts

### 2. `deleteTransaction()` — L927-L1161
**Alasan**: Cascade delete logic yang melibatkan:
- Rollback saldo dengan fresh balance
- Cascade ke debts, payment transactions, bill payments
- Fallback detection untuk legacy bill payments

### 3. `fetchFreshWalletBalance()` — L540-L548
**Alasan**: Anti race condition — selalu fetch saldo terbaru dari DB sebelum kalkulasi. Jangan ganti dengan state lokal.

### 4. Timezone-safe date — L595
**Alasan**: Fix krusial untuk mencegah tanggal bergeser 1 hari di timezone WIB (UTC+7). Pattern `T12:00:00` digunakan konsisten di seluruh app.

### 5. `markDebtAsPaid()` — L1162-L1212
**Alasan**: Logika pelunasan piutang yang membuat transaksi pemasukan otomatis + update saldo wallet. Terkait erat dengan `deleteTransaction()` yang bisa revert status.

---

## 📐 Interface Data

```typescript
export interface Transaction {
    id: number
    title: string
    amount: number
    type: 'pemasukan' | 'pengeluaran' | 'topup'
    category: string
    wallet_id?: number
    source_wallet_id?: number        // Hanya untuk topup
    date: string                      // ISO string
    created_at: string
    is_piutang?: boolean              // Pemasukan yang merupakan piutang
    piutang_person?: string           // Nama orang piutang
    is_talangan?: boolean             // Pengeluaran atas nama orang lain
    talangan_person?: string          // Nama orang talangan
}
```

---

## 📝 Catatan Penting

1. **Admin Fee** hanya berlaku untuk topup. Disimpan sebagai transaksi pengeluaran terpisah dengan `title: 'Biaya Admin'`.
2. **Piutang** (`is_piutang: true`) **tidak dihitung sebagai pemasukan nyata** di analitik.
3. **Talangan** (`is_talangan: true`) **tidak dihitung sebagai pengeluaran pribadi** di analitik.
4. `created_at` digunakan untuk **urutan tampil** (ordering), `date` untuk **tanggal transaksi** (filtering per periode).
