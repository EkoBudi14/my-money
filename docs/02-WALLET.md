# 02 — Fitur Dompet (Wallet)

## 📌 Ringkasan
Fitur wallet mengelola dua jenis dompet: **Dompet Aktif** (untuk transaksi sehari-hari) dan **Tabungan Inti** (aset simpanan). Setiap dompet memiliki saldo yang **otomatis berubah** setiap kali ada transaksi.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/wallets/page.tsx` | Halaman daftar dompet aktif (CRUD + refund logic) |
| `app/main-savings/page.tsx` | Halaman daftar tabungan inti (CRUD) |
| `app/wallet/page.tsx` | Halaman form wallet (mobile full-page wrapper) |
| `components/WalletModal.tsx` | Modal form add/edit wallet (desktop modal + mobile page mode) |
| `types/index.ts` — `Wallet` | Interface data wallet |
| `app/page.tsx` | Dashboard — menampilkan summary saldo + default wallet creation |

---

## 🔄 Kategori Wallet

### 1. **Dompet Aktif** (`category: 'active'`)
- Digunakan untuk transaksi sehari-hari (pemasukan, pengeluaran, topup)
- Ditampilkan di halaman `/wallets`
- Saldo total ditampilkan di dashboard

### 2. **Tabungan Inti** (`category: 'savings'`)
- Aset simpanan jangka panjang
- Ditampilkan di halaman `/main-savings`
- Bisa memiliki `source_wallet_id` (dompet sumber asal)
- Saat dihapus: sisa saldo **dikembalikan** ke dompet sumber

---

## ⚙️ Logic Detail

### A. Tambah Wallet
**Lokasi**: `components/WalletModal.tsx`

Fields:
- `name`: Nama dompet
- `type`: `'bank'` | `'ewallet'` | `'cash'`
- `category`: `'active'` | `'savings'`
- `balance`: Saldo awal
- `source_wallet_id`: (opsional, hanya savings) — dompet sumber asal dana

### B. Edit Wallet
- Bisa edit nama, tipe, saldo
- **Mobile**: navigasi ke `/wallet?category=xxx&edit=ID`
- **Desktop**: buka `WalletModal` dalam mode modal

### C. Hapus Wallet — **CRITICAL LOGIC**
**Lokasi**: `app/wallets/page.tsx` — `handleDelete()` (L47-L103)

Alur:
1. Fetch detail wallet yang akan dihapus
2. **Cek refund**: Jika wallet punya `source_wallet_id` DAN `balance > 0`
   - Hitung saldo baru source wallet = `sourceWallet.balance + deletedWallet.balance`
   - Update source wallet balance
   - Tampilkan pesan refund
3. **Cascade delete transaksi**: Hapus semua transaksi dengan `wallet_id = id`
4. Hapus wallet dari database

> ⚠️ **PENTING**: Hapus wallet juga menghapus SEMUA riwayat transaksi terkait.

### D. Default Wallet Creation
**Lokasi**: `app/page.tsx` — `checkAndCreateDefaultWallets()` (L480-L517)

- Hanya dijalankan **sekali** saat aplikasi pertama kali dibuka
- Jika tidak ada wallet sama sekali, buat 2 default:
  - "Tunai 💵" (`type: 'cash'`, `category: 'active'`)
  - "Rekening Bank 🏦" (`type: 'bank'`, `category: 'active'`)
- Tampilkan welcome modal

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Transaksi** | Setiap transaksi mereferensikan `wallet_id`. Saldo wallet berubah setiap CRUD transaksi |
| **Topup** | Melibatkan `wallet_id` (tujuan) dan `source_wallet_id` (sumber) |
| **Budget Quick Expense** | Insert transaksi + update saldo wallet |
| **Recurring Bills** | Pembayaran tagihan mengurangi saldo wallet |
| **Scan Receipt** | Hasil scan disimpan sebagai transaksi + update saldo wallet |
| **Analytics** | Pengeluaran per wallet ditampilkan di analytics |

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. `handleDelete()` di `app/wallets/page.tsx` — L47-L103
**Alasan**: Logic refund saldo ke source wallet + cascade delete transaksi. Urutan operasi krusial:
1. Refund saldo (harus sebelum delete)
2. Delete transaksi terkait (harus sebelum delete wallet — FK constraint)
3. Delete wallet

### 2. `checkAndCreateDefaultWallets()` di `app/page.tsx` — L480-L517
**Alasan**: Menggunakan `useRef` untuk mencegah double execution. Logic first-time setup yang hanya boleh jalan sekali.

### 3. `fetchFreshWalletBalance()` di `app/page.tsx` — L540-L548
**Alasan**: Digunakan di seluruh flow transaksi untuk anti race condition. Selalu fetch saldo terbaru dari DB.

---

## 📐 Interface Data

```typescript
export interface Wallet {
    id: number
    name: string
    type: 'bank' | 'ewallet' | 'cash'
    category: 'active' | 'savings'
    balance: number
    created_at?: string
    source_wallet_id?: number | null  // Hanya untuk savings — wallet sumber asal
}
```

---

## 📝 Catatan Penting

1. **Saldo wallet tidak pernah di-update langsung oleh user** (kecuali saat create/edit wallet melalui WalletModal). Semua perubahan saldo terjadi melalui transaksi.
2. **Refund saldo** hanya terjadi saat hapus wallet savings yang punya `source_wallet_id` dan saldo > 0.
3. **Cascade delete** transaksi saat hapus wallet bersifat **PERMANEN** dan tidak bisa di-undo.
4. Wallet ditampilkan dengan icon berbeda berdasarkan `type`: bank (CreditCard), ewallet (WalletIcon), cash (Banknote).
