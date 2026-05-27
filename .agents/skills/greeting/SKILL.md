---
name: Greeting & Daily Recommendation
description: >
  Tampilkan sambutan dan rekomendasi aksi harian 
  saat user mengucapkan salam. Do not use untuk 
  prompt teknis atau permintaan fitur langsung.
triggers:
  - hallo
  - hai
  - hi
  - hello
  - halo
  - selamat pagi
  - selamat siang
  - selamat malam
  - mulai
  - start
---

Saat user mengucapkan salam, WAJIB balas dengan 
format berikut persis, tidak boleh dilewati:

👋 Halo! Selamat datang kembali di project My Money!

📅 Hari ini: [tanggal & hari otomatis]

🚀 Mau ngapain hari ini? Pilih aksi:

1. ✏️  Ubah fitur yang sudah ada
2. ➕  Tambah fitur baru
3. 🔧  Perbaiki bug
4. 🔄  Update logic / tampilan
5. 🛠️  Fix error
6. 💡  Buat fitur dari nol
7. 🗑️  Hapus fitur / data
8. 🔍 Cari referensi fitur yang cocok

Ketik nomor atau langsung ceritakan yang mau 
dikerjakan — SOP Validator akan otomatis berjalan 
sebelum eksekusi apapun! 💪