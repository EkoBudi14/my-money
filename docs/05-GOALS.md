# 05 — Fitur Target Tabungan (Goals)

## 📌 Ringkasan
Fitur goals memungkinkan user menetapkan **target tabungan** dengan deadline opsional. User bisa menambah dana secara bertahap melalui fitur "Quick Add Savings".

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/goals/page.tsx` | Halaman utama goals — CRUD, quick add savings, progress tracking |
| `types/index.ts` — `Goal` | Interface data goal |
| `app/page.tsx` | Dashboard — fetch goals untuk summary |

---

## ⚙️ Logic Detail

### A. Tambah/Edit Goal
**Lokasi**: `app/goals/page.tsx` — `handleSave()` (L67-L98)

Fields:
- `name`: Nama target (wajib)
- `target_amount`: Jumlah target dana (wajib)
- `current_amount`: Dana terkumpul saat ini (default 0)
- `deadline`: Batas waktu (opsional, format date)

### B. Quick Add Savings
**Lokasi**: `app/goals/page.tsx` — `handleQuickAddSave()` (L100-L125)

Alur:
1. User klik "Nabung" di kartu goal
2. Input jumlah tabungan
3. Sistem: `newAmount = goal.current_amount + inputAmount`
4. Update `current_amount` di tabel `goals`

> ⚠️ **PENTING**: Quick Add **TIDAK mengupdate saldo wallet**. Ini hanya tracking progress goal, bukan transfer uang riil.

### C. Progress Tracking
- Progress: `(current_amount / target_amount) * 100`
- Completed: progress >= 100%
- Warna progress:
  - < 75%: primary blue
  - 75-99%: warning amber
  - 100%+: success emerald

### D. Hapus Goal
- Hapus data goal dari tabel `goals`
- Tidak mempengaruhi data lain

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Dashboard** | Goals data ditampilkan di dashboard sebagai summary |

> Goals adalah fitur **independen** — tidak bergantung pada transaksi atau wallet.

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. `handleQuickAddSave()` — L100-L125
**Alasan**: Logika penambahan yang sederhana tapi penting — `current_amount + inputAmount`. Jangan tambahkan logika update saldo wallet di sini (itu bukan tujuan fitur ini).

---

## 📐 Interface Data

```typescript
export interface Goal {
    id: number
    name: string
    target_amount: number
    current_amount: number
    deadline?: string
    created_at?: string
}
```

---

## 📝 Catatan Penting

1. Goals adalah **tracking tool**, bukan sistem transfer uang. Quick Add hanya mengupdate `current_amount`, tidak menyentuh saldo wallet.
2. Deadline bersifat **opsional** — hanya untuk referensi visual user.
3. Goal yang sudah tercapai (100%) tetap bisa ditambah dananya (tidak di-lock).
