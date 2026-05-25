# 04 — Fitur Manajemen Budget

## 📌 Ringkasan
Fitur budget memungkinkan user menetapkan **batas pengeluaran per kategori** untuk periode tertentu. Progres otomatis dihitung berdasarkan transaksi pengeluaran yang cocok dengan kategori budget.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/budgets/page.tsx` | Halaman utama budget — CRUD, filter, progress tracking, quick expense |
| `types/index.ts` — `Budget` | Interface data budget |
| `app/page.tsx` | Dashboard — fetch budgets untuk ditampilkan |

---

## ⚙️ Logic Detail

### A. Tambah/Edit Budget
**Lokasi**: `app/budgets/page.tsx` — `handleSave()` (L171-L218)

Fields:
- `category`: Kategori pengeluaran (dari CATEGORIES + custom categories)
- `amount`: Batas pengeluaran
- `start_date`: Tanggal mulai (YYYY-MM-DD)
- `end_date`: Tanggal selesai (YYYY-MM-DD)

Validasi:
- Semua field wajib diisi
- `start_date` tidak boleh > `end_date`
- **Duplikat check**: Query DB untuk cek overlap periode per kategori yang sama

### B. Progress Tracking
**Lokasi**: `app/budgets/page.tsx` — `getSpentAmount()` (L298-L300)

```typescript
const getSpentAmount = (cat: string) => {
    return transactions.filter(t => t.category === cat)
        .reduce((acc, curr) => acc + curr.amount, 0)
}
```

- Menghitung total pengeluaran dari transaksi yang `category` cocok
- Transaksi yang diambil sudah difilter per periode (monthly/custom) di `fetchData()`
- Progress bar: `(spent / budget.amount) * 100`
- Over budget: `spent > budget.amount` → tampil warning merah

### C. Quick Expense
**Lokasi**: `app/budgets/page.tsx` — `handleQuickExpenseSave()` (L220-L261)

Fitur pencatatan pengeluaran cepat langsung dari kartu budget:
1. Pilih wallet sumber
2. Input jumlah pengeluaran
3. **Cek saldo wallet** — tolak jika tidak cukup
4. Insert transaksi pengeluaran:
   - `title: 'Pengeluaran {kategori}'`
   - `category`: kategori budget
   - `date`: tanggal saat ini
5. **Update saldo wallet**: `balance - amount`
6. Refresh data budget & wallet

### D. Filter Period
**Lokasi**: `app/budgets/page.tsx` — L18-L80

- **Monthly mode**: filter berdasarkan bulan & tahun yang dipilih
- **Custom mode**: filter berdasarkan rentang tanggal custom
- Settings disimpan di **localStorage** (bukan Supabase, berbeda dengan dashboard)
- Budget query: `start_date <= targetEnd AND end_date >= targetStart` (overlap detection)

### E. Hapus Budget
- Hapus data budget dari tabel `budgets`
- Tidak mempengaruhi transaksi yang sudah tercatat

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Transaksi** | Progress budget dihitung dari transaksi pengeluaran per kategori |
| **Wallet** | Quick Expense mengupdate saldo wallet |
| **Kategori Kustom** | Budget bisa menggunakan kategori custom. Rename kategori otomatis mengupdate semua transaksi terkait |
| **Dashboard** | Budget data di-fetch dan ditampilkan di dashboard |

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. `handleQuickExpenseSave()` — L220-L261
**Alasan**: Insert transaksi + update saldo wallet. Dua operasi yang harus sinkron. Saldo wallet di-update manual (tidak melalui `handleSaveTransaction()`).

### 2. Budget Query Overlap — L123-L128
```typescript
const { data: bData } = await supabase
    .from('budgets')
    .select('*')
    .lte('start_date', targetEndDateStr)
    .gte('end_date', targetStartDateStr)
```
**Alasan**: Query overlap detection yang menentukan budget mana yang tampil di periode tertentu. Salah query = budget hilang atau duplikat.

### 3. Duplikat Check — L192-L201
**Alasan**: Mencegah budget duplikat untuk kategori yang sama di periode overlapping.

---

## 📐 Interface Data

```typescript
export interface Budget {
    id: number
    category: string
    amount: number
    start_date: string   // YYYY-MM-DD
    end_date: string     // YYYY-MM-DD
    created_at?: string
}
```

---

## 📝 Catatan Penting

1. Budget **bersifat per-periode** — satu kategori bisa punya budget berbeda di bulan berbeda.
2. Filter budget disimpan di **localStorage** (bukan Supabase). Ini berbeda dengan filter dashboard yang disimpan di Supabase.
3. Quick Expense **langsung mengupdate saldo wallet** tanpa melalui `handleSaveTransaction()` dari dashboard. Ini adalah jalur CRUD terpisah.
4. Kategori budget mencakup `CATEGORIES.pengeluaran` + `customCategories.pengeluaran`.
