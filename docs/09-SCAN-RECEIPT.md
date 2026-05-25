# 09 — Fitur Scan Struk (AI)

## 📌 Ringkasan
Fitur scan struk menggunakan **AI (Gemini API)** untuk membaca foto struk belanja, bukti transfer, atau tagihan. Hasil scan ditampilkan untuk review dan bisa langsung disimpan sebagai transaksi.

---

## 📁 File Terkait

| File | Peran |
|------|-------|
| `app/scan-receipt/page.tsx` | Halaman utama scan struk — kamera, upload, scan, review, save |
| `app/api/scan-receipt/route.ts` | API route — kirim gambar ke Gemini API untuk OCR/parsing |

---

## ⚙️ Logic Detail

### A. Input Gambar
**Lokasi**: `app/scan-receipt/page.tsx` — L74-L153

Dua metode:
1. **Kamera** (`openCamera()` → `capturePhoto()`):
   - `getUserMedia` dengan `facingMode: 'environment'` (kamera belakang)
   - Bisa flip ke kamera depan
   - Viewfinder overlay dengan corner marks
   - Capture foto dan compress ke 800px max + 65% JPEG quality
   
2. **Gallery** (`handleFileSelect()`):
   - File picker `accept="image/*"`
   - Compress gambar yang dipilih

### B. Kompresi Gambar
**Lokasi**: `app/scan-receipt/page.tsx` — `compressImage()` (L104-L115)

```
MAX_DIM = 800px (cukup untuk OCR teks, hemat ~60% token)
JPEG quality = 0.65
```

### C. Proses Scan (AI)
**Lokasi**: `app/scan-receipt/page.tsx` — `handleScan()` (L156-L217)

Alur:
1. Kirim gambar (base64) ke `/api/scan-receipt`
2. API route kirim ke Gemini API dengan prompt parsing
3. Response diformat ke struktur:
   - `document_type`: `'struk_belanja'` | `'bukti_transfer'` | `'tagihan'`
   - `store_name`: Nama toko/pengirim
   - `date`: Tanggal transaksi
   - `total`: Total pembayaran
   - `category`: Kategori otomatis
   - `transaction_type`: `'pemasukan'` | `'pengeluaran'`
   - `description`: Keterangan (untuk transfer)
   - `discount`: Diskon/voucher
   - `extra_fees`: Biaya tambahan (ongkir, dll)
   - `items[]`: Detail item (nama, qty, price)

### D. Rate Limiting
**Lokasi**: `app/scan-receipt/page.tsx` — L167-L193

- Handle response 429 (Rate Limit Exceeded)
- Dua tipe: per-menit dan per-hari
- Countdown timer dengan progress bar
- Tampilkan waktu reset dalam WIB

### E. Review & Edit Hasil
**Lokasi**: `app/scan-receipt/page.tsx` — L219-L250

Semua field bisa diedit sebelum disimpan:
- Edit nama toko, tanggal, total
- Tambah/hapus/edit item individual
- Auto-recalculate total saat item berubah
- Toggle arah transfer (masuk/keluar) untuk bukti transfer
- Pilih kategori dari `CATEGORIES`
- Pilih wallet tujuan

### F. Simpan sebagai Transaksi
**Lokasi**: `app/scan-receipt/page.tsx` — `handleSave()` (L253-L307)

Alur:
1. Validasi wallet & scan result
2. Cek saldo wallet (hanya untuk pengeluaran)
3. Generate judul:
   - Transfer: `"Terima Transfer dari {nama}"` / `"Transfer ke {nama}"`
   - Tagihan: `"Tagihan {nama}"`
   - Struk: `"Belanja di {nama}"`
4. Insert transaksi ke DB
5. Update saldo wallet:
   - Pemasukan: `balance + total`
   - Pengeluaran: `balance - total`

---

## 🔗 Dependency Antar Fitur

| Fitur Dependen | Pengaruh |
|----------------|----------|
| **Transaksi** | Hasil scan disimpan sebagai transaksi baru |
| **Wallet** | Pembayaran mengupdate saldo wallet |
| **Kategori** | Menggunakan CATEGORIES untuk pilihan kategori |

---

## 🔒 KODE SENSITIF — JANGAN DIUBAH TANPA IZIN

### 1. `handleSave()` — L253-L307
**Alasan**: Insert transaksi + update saldo wallet. Jalur CRUD terpisah dari `handleSaveTransaction()` di dashboard. Harus konsisten dalam format payload dan timezone handling.

### 2. `compressImage()` — L104-L115
**Alasan**: Parameter kompresi (800px, 65% quality) disetel untuk keseimbangan OCR accuracy vs token cost. Mengubah parameter bisa meningkatkan biaya API atau menurunkan akurasi.

### 3. Rate Limit Handling — L167-L193
**Alasan**: Logika konversi timezone (Pacific Time ke WIB) untuk reset harian. Cukup rumit dan sudah diverifikasi.

### 4. Timezone-safe date — L279
```typescript
const safeDate = new Date(`${scanResult.date}T12:00:00`).toISOString()
```
**Alasan**: Pattern yang sama dengan transaksi utama. Harus konsisten.

---

## 📐 Data Structure (Scan Result)

```typescript
{
    document_type: 'struk_belanja' | 'bukti_transfer' | 'tagihan'
    store_name: string
    date: string           // YYYY-MM-DD
    total: number
    category: string
    transaction_type: 'pemasukan' | 'pengeluaran'
    description: string
    discount: number
    extra_fees: number
    items: Array<{
        name: string
        qty: number
        price: number
    }>
}
```

---

## 📝 Catatan Penting

1. Scan struk menggunakan **Gemini API** — memerlukan API key di environment variables.
2. Kompresi gambar dilakukan **client-side** sebelum dikirim ke API untuk menghemat bandwidth dan token.
3. Jalur save transaksi di scan receipt **terpisah** dari `handleSaveTransaction()` di dashboard. Perubahan di salah satu harus dipertimbangkan impaknya ke yang lain.
4. Auto-recalculate total item saat edit — jika user ubah total manual, bisa override kalkulasi otomatis.
5. `is_piutang: false` dan `is_talangan: false` di-hardcode untuk scan receipt.
