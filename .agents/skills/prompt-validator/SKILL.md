---
name: Prompt Scope Validator
description: >
  Gunakan setiap kali user meminta perubahan,
  penambahan, atau perbaikan fitur di project ini.
  Validasi prompt sebelum eksekusi kode.
  Do not use untuk salam pembuka atau pertanyaan umum.
triggers:
  - ubah
  - tambah
  - perbaiki
  - update
  - fix
  - buat fitur
  - hapus
  - benerin
  - coba cek
  - cek
  - cek dulu
  - periksa
  - periksa dulu
  - lihat
  - lihat dulu
  - bug nih
  - bug
  - cek lagi
  - cek lagi fitur ini
  - bisa perbaiki
  - coba
  - coba liat
  - ini kenapa dah
  - ini kenapa
  - ini gimana ya
  - ini gimana
  - ini kok gini
  - ini kok jadi gini
  - harusnya gini
  - harusnya gini lho
  - ini
  - ini kok
  - error
  - kok gini sih
  - kok jadi gini
  - error nih
  - bisa
  - gas
  - boleh
---

# 14 — SOP Monitoring & Prompt Scope Validator

**Versi:** 1.3
**Terakhir diupdate:** 2026-05-25
**Status:** Active

---

## 📌 Tujuan
Dokumen ini mengatur Standar Operasional Prosedur (SOP) untuk memastikan setiap *prompt* (permintaan) dari user dievaluasi kesesuaiannya dengan dokumentasi teknis yang ada. Tujuannya adalah untuk mencegah perubahan kode yang melenceng dari batasan (scope) atau merusak fitur lain tanpa disadari.

## 🚀 Cara Penggunaan
Agar SOP ini berjalan efektif di setiap sesi:

1. **Paste dokumen ini di awal setiap sesi baru** sebelum mulai memberikan prompt apapun.
2. **Tunggu konfirmasi AI** bahwa dokumen sudah dibaca dan dipahami.
3. **Baru lanjutkan dengan prompt fitur** — AI akan otomatis mengikuti seluruh aturan SOP ini.

> 💡 **Tips**: Jika menggunakan Cursor / Windsurf / API, masukkan dokumen ini ke **system prompt** agar tidak perlu paste manual setiap sesi.

---

## ⚙️ Cara Kerja (SOP AI Assistant)
Karena AI Assistant (saya) memiliki akses langsung ke seluruh file dokumentasi `docs/*.md`, proses monitoring ini **tidak memerlukan tools eksternal**. Proses ini akan menjadi langkah otomatis setiap kali user memberikan prompt baru.

Setiap kali user memberikan tugas untuk mengubah, menambah, atau memperbaiki fitur, AI **WAJIB** melakukan langkah validasi berikut sebelum mengubah kode apa pun:

0. **Konfirmasi Pemahaman**: Sebagai langkah paling awal, AI wajib menggunakan *template* persis seperti di bawah ini, yang harus muncul di baris paling atas setiap *reply* (sebelum blok Laporan Validator). Tidak boleh dilewati dalam kondisi apapun:
   ```text
   📋 KONFIRMASI PEMAHAMAN
   - Prompt diterima  : [Ringkasan 1 baris prompt user]
   - Fitur yang dikerjakan : [Nama fitur]
   - Referensi docs   : [Nama file .md yang akan dibaca]
   - Scope pekerjaan  : [Apa yang akan dilakukan, apa yang tidak akan disentuh]
   ```
1. **Analisis Prompt**: Mengidentifikasi modul/fitur apa saja yang akan terpengaruh oleh permintaan user.
2. **Cross-check Dokumentasi**: AI **hanya** membaca file `docs/*.md` yang relevan dengan prompt saja (bukan semua file sekaligus). AI wajib menampilkan blok berikut:
   ```text
   📂 DOCS YANG DIBACA
   - [nama-file.md] → Alasan: [kenapa file ini relevan dengan prompt]
   - [nama-file.md] → Alasan: [kenapa file ini relevan dengan prompt]
   ```
   - **Aturan Penting**: Jika tidak ada file yang relevan, wajib tulis: "Tidak ada docs relevan yang dibaca." — bagian ini tidak boleh dikosongkan.
   - Perhatikan dengan saksama bagian **🔒 KODE SENSITIF**.
3. **Keluarkan Laporan Validator**: Memberikan laporan singkat kepada user dengan format baku (termasuk Impact Analyzer).
4. **Catat di Changelog Otomatis**: Setelah kode dieksekusi dan disetujui, AI wajib mencatat histori perubahan tersebut ke dalam file `CHANGELOG.md` dengan format khusus (append-only).
5. **Alur Penolakan (Jika User Menolak Plan)**: Jika user menolak atau tidak menyetujui rencana (*Implementation Plan*) yang diajukan, AI **WAJIB**:
   - Berhenti total — tidak mengeksekusi kode apapun.
   - Kembali ke langkah analisis prompt dari awal.
   - Menunggu instruksi revisi dari user sebelum melanjutkan.
   - Tidak boleh mengasumsikan atau menebak apa yang user inginkan.
   - Meminta klarifikasi secara eksplisit dari user terkait penolakan tersebut.

---

## 📝 Format Laporan Validator

Sebelum AI menulis *Implementation Plan* (rencana kode) atau mengubah file, AI akan membalas dengan format berikut:

> **Aturan Penulisan Laporan (Token Efficiency)**:
> - Laporan wajib ditulis **ringkas dan padat** (maksimal 5 poin per section).
> - Hindari penjelasan panjang yang tidak perlu; gunakan kalimat singkat dan langsung ke sasaran.
> - Jika statusnya ✅ **AMAN** (tidak ada risiko), cukup berikan 1 baris penjelasan singkat.

**🔍 PROMPT SCOPE VALIDATOR**
- **Status**: `[✅ AMAN / ⚠️ WARNING / ❌ BAHAYA]`
- **Dokumentasi Terkait**: `[Misal: 01-TRANSAKSI.md, 02-WALLET.md]`
- **Analisis Risiko**: `[Penjelasan apakah prompt menyentuh logic sensitif atau berisiko merusak integrasi lain]`
- **Rekomendasi/Tindakan**: `[Apa yang akan dilakukan AI selanjutnya]`

*(Aturan Tampilan)*
- Jika ✅ **AMAN**    → Langsung eksekusi, skip bagian *Impact Analyzer*.
- Jika ⚠️ **WARNING** → Tampilkan *Impact Analyzer*, tunggu persetujuan user.
- Jika ❌ **BAHAYA**  → Tetap tampilkan Status & Analisis Risiko agar user tahu alasannya, tapi skip Impact Analyzer sepenuhnya. Minta klarifikasi atau revisi prompt dari user.

**🧮 IMPACT ANALYZER & TESTING**
🎯 Target: `[Fitur Utama Target]`

📊 Analisis Dampak & Pengecekan:
├── Fitur `[Nama]`       → `[✅ Low / ⚠️ Medium / ❌ High]`
│   ├── ⚠️ **Alasan**: `[Alasan kenapa perlu dicek, dan file/fungsi mana yang berisiko]`
│   └── 🛠️ **Cek**: `[Langkah manual pengecekan]`
└── Fitur `[Nama]`       → `[✅ Low / ⚠️ Medium / ❌ High]`
    ├── ⚠️ **Alasan**: `[Alasan kenapa perlu dicek, dan file/fungsi mana yang berisiko]`
    └── 🛠️ **Cek**: `[Langkah manual pengecekan]`

🔴 Kesimpulan: `[Perlu review dulu sebelum eksekusi / Aman dilanjutkan]`
Alasan: `[Alasan kesimpulan]`

---

## 📜 Format Changelog

Wajib mencatat: tanggal & waktu, fitur yang diubah, deskripsi perubahan, prompt yang memicu, fitur terdampak, dan status.
Changelog bersifat **append-only** — entri lama tidak boleh dihapus atau diedit.

**Aturan Pencatatan Berdasarkan Status:**
- Jika ✅ **AMAN**    → Changelog tetap dicatat (ringkas, cukup 2-3 baris).
- Jika ⚠️ **WARNING** → Changelog dicatat lengkap dengan semua *field* format baku.
- Jika ❌ **BAHAYA**  → Tidak ada changelog (tidak ada eksekusi).

**Format ringkas untuk ✅ AMAN (cukup 3 baris):**
```text
[YYYY-MM-DD | HH:MM] Fitur: [Nama Fitur]
Perubahan: [Deskripsi singkat]
Status: Approved
---
```
*(Field "Dipicu oleh prompt" dan "Fitur terdampak" boleh dilewati untuk status AMAN).*

**Format lengkap yang harus digunakan di `CHANGELOG.md`:**
```text
[YYYY-MM-DD | HH:MM] Fitur: [Nama Fitur]
Perubahan: [Deskripsi singkat perubahan]
Dipicu oleh prompt: "[Prompt asli user]"
Fitur terdampak: [Nama Fitur] (Medium), [Nama Fitur] (Low)
Status: Approved / Pending Review
---
```

---

## 🚦 Definisi Status

| Status | Kriteria | Tindakan AI |
|--------|----------|-------------|
| ✅ **AMAN** | Perubahan terisolasi (misal: ubah warna, tambah komponen UI statis, tambah logic yang tidak menyentuh state utama atau database inti). | Langsung buat *Implementation Plan* atau eksekusi perubahan. |
| ⚠️ **WARNING** | Perubahan menyentuh database utama, logika kalkulasi uang, state di `app/page.tsx`, atau hal-hal di bagian `🔒 KODE SENSITIF`. | Harus sangat berhati-hati. Buat *Implementation Plan* secara detail dan **TUNGGU PERSETUJUAN USER** sebelum coding. |
| ❌ **BAHAYA** | Prompt meminta hal yang melenceng jauh dari aturan (misal: minta refactor besar-besaran, atau secara tidak sengaja meminta fitur yang mematikan fitur lain). | **STOP.** AI tidak akan menulis kode. AI akan memberitahu user alasan bahayanya dan meminta klarifikasi atau revisi prompt. |

> ⚠️ **Catatan Default:**
> Jika AI ragu apakah suatu prompt masuk kategori WARNING atau BAHAYA, default ke ❌ **BAHAYA** — lebih aman salah ke arah konservatif daripada mengeksekusi sesuatu yang berisiko merusak fitur lain.

---

## 🔐 Definisi Kode Sensitif (Global)

Berikut adalah kategori kode sensitif di seluruh project secara umum yang **wajib** diwaspadai dan masuk kategori ⚠️ **WARNING** atau ❌ **BAHAYA**:

1. **Logic kalkulasi keuangan & transaksi**
   - *Contoh:* Fungsi `handleSaveTransaction` dan `deleteTransaction` di `app/page.tsx`, `fetchFreshWalletBalance`.
2. **Koneksi database & schema**
   - *Contoh:* Inisialisasi Supabase client di `lib/supabase.ts`, semua query CRUD ke tabel utama.
3. **Authentication & authorization**
   - *Contoh:* Query spesifik ke tabel `user_settings` (`id=1`) sebagai mekanisme single-user.
4. **State management utama**
   - *Contoh:* State global `transactions`, `wallets`, `debts` di "Fat Dashboard" (`app/page.tsx`).
5. **File konfigurasi environment (.env, config files)**
   - *Contoh:* Variabel environment `NEXT_PUBLIC_SUPABASE_URL`, konfigurasi di `next.config.mjs` / `tailwind.config.ts`.
6. **API integration dengan sistem eksternal**
   - *Contoh:* Pemanggilan Gemini API di `app/api/scan-receipt/route.ts`, fetch data libur di `app/api/holidays/route.ts`.

---

## 🚫 Larangan AI (Hard Rules)

Berikut adalah daftar larangan tegas yang **WAJIB** dipatuhi AI dalam kondisi apapun tanpa pengecualian:
- Dilarang melakukan refactor, rename, atau restrukturisasi kode kecuali diminta secara eksplisit.
- Dilarang mengubah kode di luar scope prompt yang diberikan.
- Dilarang menghapus atau mengedit entri lama di `CHANGELOG.md`.
- Dilarang melanjutkan eksekusi jika status validator adalah ❌ **BAHAYA**.
- Dilarang mengasumsikan persetujuan — harus menunggu konfirmasi eksplisit dari user.
