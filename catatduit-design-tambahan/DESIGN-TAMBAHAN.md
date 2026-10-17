# CatatDuit — Spesifikasi Tambahan (v1.3, 17 Oktober 2026)

Dokumen ini melengkapi `design/DESIGN.md`. Isinya: semua dialog, menu aksi, toast, validasi, kondisi kosong/loading/error, modal web, dan fitur lama yang belum tercakup di versi pertama.

Isi bagian ini diambil dari kode app yang sedang berjalan (bundle JS di my-money-sandy.vercel.app), bukan tebakan. Teks lama dikutip apa adanya supaya bisa dicari di kode.

## 0. Cara pakai

1. Salin isi folder ini ke folder `design/` yang sudah ada:
   - `DESIGN-TAMBAHAN.md` → `design/DESIGN-TAMBAHAN.md`
   - `screens/*.dc.html` → `design/screens/`
   - `tokens/catatduit.css` sama persis dengan versi sebelumnya; tidak perlu ditimpa.
2. Tambahkan ke `CLAUDE.md` project:
   ```
   Baca design/DESIGN.md lalu design/DESIGN-TAMBAHAN.md sebelum mengubah tampilan.
   Kalau dua dokumen bertentangan, DESIGN-TAMBAHAN.md yang berlaku.
   ```
3. **v1.3 juga memperbaiki 16 layar di folder pertama** supaya sesuai app lama. Kalau folder `catatduit-design` sudah disalin ke project, timpa layar ini dan `DESIGN.md` dengan versi terbaru: `AgendaBaru`, `BudgetBaru`, `BudgetWeb`, `Catatan`, `CatatanBaru`, `CatatanWeb`, `DompetBaru`, `DompetWeb`, `Export`, `Kategori`, `Lainnya`, `Periode`, `Tambah`, `TambahWeb`, `Main`, `Web`.
4. **Aturan utama:** semua perilaku data di bagian 3 (apa yang ikut terhapus, saldo yang dikembalikan) **wajib sama dengan kode lama**. Redesign hanya mengubah tampilan dan teks.

## 1. Koreksi untuk DESIGN.md

Versi pertama salah menganggap beberapa fitur sebagai "baru" atau tidak menyebutnya sama sekali. Yang benar:

| Topik | Di DESIGN.md | Yang benar (kode lama) | Layar acuan |
|---|---|---|---|
| Ubah transaksi | Fitur baru opsional | **Sudah ada.** Tap baris transaksi → `/transaction?type=…&edit={id}`, judul "Edit Transaksi", tombol "Update Transaksi". Tidak ada tombol hapus di dalam form | `UbahTransaksi` |
| Piutang aktif + pelunasan | Tidak disebut | **Sudah ada.** Kartu "Daftar Piutang" di dashboard (hanya kalau ada piutang `pending`), tombol "Lunas" → modal "Lunasi Piutang" pilih dompet penerima. Membuat transaksi "Pelunasan Piutang: {nama}" dan menandai `debts.status = paid` | `PiutangAktif`, `LunasiPiutang` |
| Onboarding user baru | Tidak disebut | **Sudah ada.** 2 langkah: (1) "Selamat Datang", 2 dompet otomatis Tunai + Rekening Bank; (2) "Setup Tabungan (Opsional)" buat dompet Tabungan atau "Lewati, nanti saja" | `Onboarding1`, `Onboarding2` |
| Budget: tap kartu | Menu ⋯ (Ubah, Hapus) | **Sudah ada 3 aksi:** "Tap untuk edit / hapus / catat". Catat = pengeluaran cepat (jumlah + dompet), judul otomatis "Pengeluaran {kategori}" | `AksiBudget`, `CatatBudget` |
| Batalkan pembayaran tagihan | Tidak disebut | **Sudah ada.** Tagihan yang sudah dibayar punya aksi "Batalkan". Transaksi pembayaran dihapus, saldo dikembalikan | `AksiTagihan`, `BatalBayar` |
| Pemasukan rutin | Hanya tab | **Sudah ada aksi "Terima"** (catat pemasukan rutin masuk ke dompet), label status "Sudah diterima" | `AksiTagihan` (varian), `ModalWeb` |
| Kalender | Pindah ke Catatan, hanya agenda | **Kalender ada di beranda (HP dan web) dan tetap di sana.** Isi: jam berjalan, tanggal hari ini, grid bulan, hari libur nasional (nama + jenis), tagihan per tanggal (Bayar / Terima / Batalkan), agenda per tanggal ("+ Catatan" di app lama → "+ Agenda"). Strip kalender di halaman Catatan dihapus | `Main`, `Web`, `KalenderTanggal` |
| Riwayat transaksi di beranda | Baris hanya tampilan | **Baris bisa diklik untuk ubah** (HP: pindah ke `/transaction?type=…&edit={id}`; web ≥768px: form ubah terbuka di beranda). Web juga punya tombol "Hapus" per baris (status "Menghapus…"), plus tombol Export dan Refresh di header kartu. "Lihat Semua" lama ke `/analytics` | `Main`, `Web`, `UbahTransaksi`, `ModalWeb` |
| Scan struk | Satu layar "Cek hasil" sederhana | **Alur lama lebih lengkap:** jenis dokumen (Struk Belanja / Tagihan / Bukti Transfer), arah transfer (keluar / terima), item bisa diedit (nama, qty, harga), subtotal, diskon/voucher, biaya tambahan, total dibayar, kategori, dompet, cek saldo cukup, layar kamera, kuota harian habis, layar berhasil | `ScanCek`, `ScanStatus` (gantikan `ScanHasil`) |
| Voice input | Kartu hasil read-only | **Hasil lama bisa diedit:** tipe Masuk / Keluar / Transfer, nominal, keterangan, tanggal, kategori, "Pengaturan Dompet" (dari/ke). State: mendengarkan, AI menganalisa, gagal + "Coba lagi", berhasil | `VoiceHasil`, `VoiceStatus` |
| Popup sukses | Toast | App lama memakai **popup tengah** bertipe create/edit/delete ("Pengeluaran Dicatat!", "Tabungan Bertambah!"). Redesign: ganti dengan toast (bagian 4). Logika simpan tidak berubah | `PolaDialog` §3 |
| Hapus transaksi | Dialog sederhana | Ada **3 varian** tergantung data terkait (bagian 3) | `HapusKonfirmasi`, `HapusTransaksiPiutang` |
| Hapus dompet | Belum ada | Menghapus **semua transaksi dompet itu** (bagian 3) | `HapusDompet` |
| Periode / filter | "Siklus gajian" (7.1, 7.6, 7.12, 7.14, profil Lainnya) | **Tidak ada siklus gajian di kode.** Filter punya 2 mode: **Bulanan** (pilih tahun lalu bulan, tanggal 1 sampai akhir bulan) dan **Custom** (dari–sampai). Rentang custom disimpan dan dipakai lagi. Halaman Budget punya filter sendiri (`localStorage`: `budget_filterMode`, `budget_customRange`, `budget_currentDate`). Tombol "Atur siklus gajian" di Lainnya dihapus | `Periode`, `ModalWeb`, `Lainnya` |
| Export Excel | Pilihan isi Semua / Pengeluaran / Pemasukan | **Tidak ada filter jenis.** Satu file berisi 4 sheet: Transaksi (periode aktif), Per kategori, Rekap per rentang (semua rentang custom 2 hari atau lebih), Dompet (saldo saat ini). Nama file `CatatDuit_{periode}.xlsx` | `Export`, `ModalWeb` |
| Catatan (`notes`) | Judul + isi + warna label + chip Catatan/Pengingat | **Hanya judul + isi.** Tidak ada warna dan tipe. Judul boleh kosong (tersimpan "Catatan Baru"); judul dan isi tidak boleh kosong dua-duanya. Urut `updated_at` terbaru | `Catatan`, `CatatanWeb`, `CatatanBaru`, `ModalWeb` |
| Agenda kalender (`calendar_events`) | Warna bebas | Field: judul, tipe `note`/`reminder` (hanya label "Catatan"/"Pengingat", tidak memicu apa pun), warna **blue, green, yellow, red, purple** (default blue). Pengingat tidak muncul otomatis di beranda | `AgendaBaru`, `ModalWeb` |
| Form budget | Default siklus gajian, kategori yang sudah punya budget disembunyikan, info "Rata-rata 3 periode terakhir", toggle "Ulangi tiap periode" | Field hanya **kategori, batas, mulai, selesai**. Default tanggal = periode yang sedang dipilih di halaman Budget. Semua kategori pengeluaran tampil; bentrok ditolak dengan error. Tidak ada rata-rata dan tidak ada ulang otomatis (dua-duanya dipindah ke bagian 10) | `BudgetBaru`, `BudgetWeb` |
| Form transaksi: kartu budget | Tidak disebut | **Sudah ada.** Saat pengeluaran + kategori punya budget aktif di tanggal itu: "Budget {kategori}", status "Dalam batas" / "Limit terlampaui", "Terpakai + baru", bar (kuning di atas 80%, merah kalau lewat), "Sisa: Rp X". Hitungan: transaksi kategori itu dalam rentang budget, tanpa talangan, tanpa transaksi yang sedang diubah, dikurangi bagian teman di split bill; nominal baru = bagian kamu saja | `Tambah`, `TambahWeb`, `UbahTransaksi` |
| Form transaksi: Jam | Field Jam | **Kode lama hanya tanggal** (jam diisi otomatis). Field Jam = fitur baru opsional (bagian 10). Kalau belum dikerjakan, tampilkan Tanggal saja selebar penuh | `Tambah`, `TambahWeb`, `UbahTransaksi` |
| Sembunyikan nominal | Toggle "Sembunyikan nominal saat buka app" di Lainnya | Kode lama: nominal **selalu tersembunyi saat app dibuka**, dibuka lewat tombol mata ("Tampilkan angka" / "Sembunyikan angka") di kartu saldo. Tidak ada pengaturan. Toggle di Lainnya dihapus | `Main`, `Web`, `Lainnya` |
| Ganti nama kategori custom | Tidak disebut | Ganti nama **ikut mengubah kategori di semua transaksi lama** (`transactions.update({category})`). Nama kembar ditolak: "Kategori ini sudah ada!" | `Kategori` |
| Dompet baru dengan sumber dana | "Hubungkan supaya perpindahan tercatat" | Saldo awal **dipotong dari dompet sumber** dan dicatat transaksi `topup` "Isi saldo awal dari {sumber}". Ditolak kalau saldo sumber kurang. Saat ubah: naik = "Isi saldo dari {sumber}", turun = selisih dikembalikan dan transaksi topup terakhir dihapus. Judul form aset: "Aset Baru" / "Edit Aset" | `DompetBaru`, `DompetWeb`, `UbahDompet`, `ModalWeb` |

Tabel 0.5 di DESIGN.md: hapus baris "Ubah (edit) transaksi" dari "Fitur baru". Baris "Halaman daftar Tagihan rutin" tetap baru (app lama: widget dashboard + `/recurring` form saja).

## 2. Daftar layar tambahan

| File | Isi | Halaman induk | Status |
|---|---|---|---|
| `PolaDialog` | Pola konfirmasi hapus (biasa, berdampak besar, web), menu aksi (HP sheet, web dropdown), toast, validasi, tombol menyimpan, buang perubahan | semua | Pola |
| `PolaState` | 12 kondisi kosong, 3 skeleton, gagal muat, offline | semua | Pola |
| `ModalWeb` | 12 modal web: dompet, budget, catat pengeluaran budget, goal, nabung, tagihan rutin, bayar tagihan, lunasi piutang, catatan, agenda, export, periode | web | Pola |
| `PiutangAktif` | Kartu "Piutang aktif" di beranda | Beranda | Lama |
| `LunasiPiutang` | Sheet pilih dompet penerima | Beranda | Lama |
| `Onboarding1`, `Onboarding2` | Onboarding user baru | — | Lama |
| `UbahTransaksi` | Form ubah terisi + tombol Hapus di bawah | Riwayat | Lama (tombol Hapus di form = tambahan UI) |
| `HapusTransaksiPiutang` | Konfirmasi hapus transaksi yang punya piutang | Riwayat | Lama |
| `UbahDompet` | Form ubah dompet + info selisih saldo + Hapus | Dompet | Lama |
| `HapusDompet` | Konfirmasi hapus dompet (ikut hapus semua transaksi) | Dompet | Lama |
| `AksiBudget` | Sheet: Catat pengeluaran, Lihat transaksi, Ubah, Hapus | Budget | Lama (kecuali "Lihat transaksi") |
| `CatatBudget` | Sheet pengeluaran cepat dari budget | Budget | Lama |
| `AksiTagihan` | Sheet aksi tagihan yang sudah dibayar | Tagihan rutin | Lama |
| `BatalBayar` | Konfirmasi batalkan pembayaran | Tagihan rutin | Lama |
| `ScanCek` | Cek hasil scan lengkap (interaktif: ganti jenis dokumen) | Scan | Lama, gantikan `ScanHasil` dan bagian kanan `ScanWeb` |
| `ScanStatus` | Kamera, memproses, kuota habis, berhasil | Scan | Lama |
| `VoiceHasil` | Hasil suara bisa diedit (interaktif: ganti tipe) | Voice | Lama, gantikan kartu hasil di `Voice`/`VoiceWeb` |
| `VoiceStatus` | Mendengarkan, menganalisa, gagal, berhasil | Voice | Lama |
| `KalenderTanggal` | Kalender bulan dengan penanda libur/tagihan/agenda + detail tanggal | Beranda (kartu Kalender) | Lama |

Versi web dari layar HP di atas: modal di `ModalWeb`, dialog konfirmasi di `PolaDialog` §1C, menu di `PolaDialog` §2 (dropdown).

## 3. Hapus dan batal: teks dan perilaku per entitas

Kolom "Perilaku data" = yang dilakukan kode lama. **Jangan diubah.** Kolom teks = teks baru untuk dialog redesign. Varian A/B mengacu ke `PolaDialog` §1.

| Entitas | Judul dialog | Isi dialog | Tombol | Varian | Perilaku data (kode lama) | Toast |
|---|---|---|---|---|---|---|
| Transaksi biasa | Hapus transaksi “{judul}”? | Saldo {dompet} {bertambah/berkurang} lagi Rp {nominal}. Transaksi yang dihapus tidak bisa dikembalikan. | Batal · **Hapus transaksi** | A | Hapus baris. Pengeluaran: saldo dompet + nominal. Pemasukan/topup: saldo − nominal | Transaksi dihapus |
| Transfer / topup | Hapus transfer “{asal} ke {tujuan}”? | Saldo {asal} dan {tujuan} kembali seperti sebelum transfer, termasuk biaya admin Rp {admin}. | Batal · **Hapus transfer** | A | Hapus transaksi topup. Kode juga mencari transaksi "Biaya Admin" di dompet sumber; ikuti logika itu | Transfer dihapus |
| Transaksi pembayaran tagihan | Hapus transaksi “{judul}”? | Tagihan {nama} kembali berstatus belum dibayar bulan ini. Saldo {dompet} bertambah Rp {nominal}. | Batal · **Hapus transaksi** | A | Hapus transaksi + reset `bill_payments` terkait ("Status tagihan terkait berhasil di-reset!") | Transaksi dihapus. Tagihan {nama} belum dibayar lagi |
| Transaksi pelunasan piutang | Hapus pelunasan dari {nama}? | Piutang {nama} Rp {nominal} kembali aktif. Saldo {dompet} berkurang Rp {nominal}. | Batal · **Hapus pelunasan** | A | Hapus transaksi, `debts` terkait dikembalikan ke `pending` | Pelunasan dihapus. Piutang {nama} aktif lagi |
| Transaksi dengan piutang (split bill) | Hapus transaksi dan piutangnya? | “{judul}” punya data terkait. Daftar: {n} piutang ({nama-nama}) dihapus; {m} pelunasan dibatalkan (kalau ada); saldo disesuaikan otomatis. | Batal · **Hapus semua** (aktif setelah centang “Saya paham, ini tidak bisa dibatalkan”) | B | Hapus semua `debts` dengan `original_transaction_id`, hapus transaksi pelunasannya + kembalikan saldo, lalu hapus transaksi asli. Teks lama: "Hapus Transaksi & Piutang?" / "Ya, Hapus Semua" | Transaksi dan {n} piutang dihapus |
| Dompet aktif | Hapus dompet “{nama}”? | Semua riwayat transaksi dompet ini ikut terhapus. Laporan periode lalu ikut berubah. Daftar: {n} transaksi; saldo Rp {saldo} dikembalikan ke {sumber} (hanya kalau punya sumber dana dan saldo > 0). Saran: “Kalau cuma tidak dipakai lagi, ubah saldonya jadi Rp 0 saja.” | Batal · **Hapus dompet** (aktif setelah centang “Saya paham {n} transaksi akan hilang”) | B | Kembalikan saldo ke `source_wallet_id` (kalau ada & > 0), hapus semua `transactions` dengan `wallet_id`, hapus dompet. Teks lama menulis "SEMUA RIWAYAT TRANSAKSI terkait akan TERHAPUS" | Dompet {nama} dan {n} transaksi dihapus |
| Aset tabungan inti | Hapus aset “{nama}”? | Nilai Rp {nilai} tidak lagi dihitung di aset tersimpan. | Batal · **Hapus aset** | A | Hanya hapus baris dompet kategori `savings`. **Kode lama tidak menghapus transaksinya** (lihat bagian 9) | Aset {nama} dihapus |
| Kategori custom | Hapus kategori “{nama}”? | Transaksi lama tetap tersimpan dengan nama kategori ini, tapi ikon dan warnanya kembali ke bawaan. | Batal · **Hapus kategori** | A | Hapus dari `user_settings.custom_categories`. Histori tidak diubah | Kategori dihapus |
| Budget | Hapus budget “{kategori}”? | Transaksi yang sudah tercatat tidak ikut terhapus. | Batal · **Hapus budget** | A | Hapus baris `budgets` | Budget dihapus |
| Goal | Hapus goal “{nama}”? | Catatan terkumpul Rp {terkumpul} ikut hilang. Saldo dompet tidak berubah. | Batal · **Hapus goal** | A | Hapus baris `goals`. Nabung di app lama tidak memotong dompet, jadi tidak ada saldo yang dikembalikan | Goal dihapus |
| Tagihan / pemasukan rutin | Hapus tagihan rutin “{nama}”? | Pengingat bulanan berhenti. Transaksi pembayaran yang sudah tercatat tidak ikut terhapus. | Batal · **Hapus** | A | Kode lama hanya menghapus baris `recurring_bills`. Transaksi pembayaran tetap ada. `bill_payments` tidak dihapus oleh kode; cek apakah ada foreign key cascade di Supabase | Tagihan rutin dihapus |
| Batalkan pembayaran tagihan | Batalkan pembayaran {nama}? | Transaksi “{judul}” Rp {nominal} dihapus dan saldonya dikembalikan ke {dompet}. Tagihan kembali berstatus belum dibayar. | Kembali · **Batalkan bayar** | A (ikon kuning) | Hapus `bill_payments` bulan ini + transaksinya, saldo dompet + nominal. Teks lama sama, tombol "Batalkan Bayar" / "Kembali" | Pembayaran {nama} dibatalkan |
| Batalkan penerimaan pemasukan rutin | Batalkan penerimaan {nama}? | Transaksi pemasukan Rp {nominal} dihapus dan saldo {dompet} berkurang. | Kembali · **Batalkan** | A | Sama dengan tagihan, arah saldo terbalik | Penerimaan {nama} dibatalkan |
| Catatan | Hapus catatan “{judul}”? | Catatan dihapus permanen. | Batal · **Hapus catatan** | A | Hapus permanen | Catatan dihapus |
| Agenda kalender | Hapus agenda “{isi}”? | Agenda tanggal {tanggal} dihapus permanen. | Batal · **Hapus agenda** | A | Hapus `calendar_events` | Agenda dihapus |
| Item rincian scan | — (tanpa dialog) | — | ikon × di baris | — | Hapus dari daftar item sebelum simpan, total dihitung ulang | — |

Aturan teks:
- Selalu tulis nama data di judul. Jangan “item ini”.
- Kalimat dampak menyebut dompet dan nominal yang berubah.
- Tombol kiri Batal/Kembali (fokus awal), kanan merah dengan kata kerja.
- Varian B (centang dulu) hanya untuk aksi yang menghapus data lain: dompet dan transaksi dengan piutang.

## 4. Toast (menggantikan popup sukses)

Posisi: HP di atas bottom nav, web kanan bawah. Durasi 4 detik, error 6 detik. Satu toast sekaligus; toast baru menggantikan yang lama.

| Teks lama | Toast baru |
|---|---|
| Transaksi berhasil disimpan! 🎉 / Pengeluaran Dicatat! | Pengeluaran tersimpan / Pemasukan tersimpan / Transfer tersimpan |
| (Update Transaksi) | Perubahan tersimpan |
| Transaksi berhasil dihapus dan saldo dompet dikembalikan. | Transaksi dihapus |
| Dompet baru berhasil ditambahkan! / Dompet berhasil diperbarui! | Dompet ditambahkan / Perubahan tersimpan |
| Dompet berhasil dihapus beserta seluruh riwayat transaksinya. | Dompet {nama} dan {n} transaksi dihapus |
| Saldo Rp X dikembalikan ke {dompet} | Saldo Rp X dikembalikan ke {dompet} (varian kuning) |
| Aset tabungan berhasil dihapus. | Aset dihapus |
| Budget baru berhasil ditambahkan! / Budget berhasil diperbarui! / Budget berhasil dihapus dari daftar. | Budget ditambahkan / Perubahan tersimpan / Budget dihapus |
| Target tabungan baru berhasil ditambahkan! / … diperbarui! / … dihapus. | Goal ditambahkan / Perubahan tersimpan / Goal dihapus |
| Tabungan Bertambah! Dana berhasil ditambahkan ke tabungan kamu 🎉 | Rp {nominal} masuk ke {goal} |
| Tagihan berhasil dibayar! / Pemasukan berhasil dicatat! 🎉 | Tagihan {nama} dibayar / Pemasukan {nama} dicatat |
| Pembayaran dibatalkan | Pembayaran {nama} dibatalkan |
| Piutang Lunas! 🎉 | Piutang {nama} lunas |
| Catatan baru berhasil disimpan! / Catatan berhasil diperbarui! / Catatan dihapus | Catatan tersimpan / Perubahan tersimpan / Catatan dihapus |
| Kategori ditambahkan! / Kategori diperbarui! / Kategori dihapus | Kategori ditambahkan / Perubahan tersimpan / Kategori dihapus |
| Sedang menyiapkan laporan Excel... | Menyiapkan file Excel… (info, sampai unduhan mulai) |
| Berhasil mengekspor N transaksi (periode)! | {N} transaksi diekspor |
| 📸 Foto dari galeri berhasil dimuat! / 📋 Foto berhasil di-paste! | Tanpa toast. Langsung masuk layar memproses |

Tombol **Urungkan** di toast hapus = fitur baru opsional. Kalau belum dibuat, toast tanpa tombol.

## 5. Validasi dan pesan error

Error yang menghalangi simpan tampil **di bawah field terkait** (merah, ikon i). Toast error hanya untuk gagal jaringan/server.

| Pesan lama | Pesan baru | Tampil di |
|---|---|---|
| Mohon lengkapi data dengan benar! Jumlah harus lebih dari 0. / Jumlah tidak valid / Mohon masukkan jumlah! | Isi jumlah lebih dari Rp 0. | field Jumlah |
| (kategori wajib dipilih) | Pilih satu kategori. | grid Kategori |
| Mohon lengkapi data | Pilih dompet. (atau field lain yang kosong) | field yang kosong |
| Saldo dompet tidak mencukupi / Saldo sumber dana tidak mencukupi! / Saldo tidak mencukupi! Saldo X: Rp Y | Saldo {dompet} kurang Rp {selisih}. Pilih dompet lain atau ubah jumlah. | field Dompet |
| Sumber dana dan dompet tujuan tidak boleh sama! | Dompet tujuan harus beda dengan dompet asal. | field Ke dompet |
| Tanggal mulai tidak boleh lebih dari tanggal selesai | Tanggal mulai harus sebelum tanggal selesai. | field Mulai + Selesai |
| Budget untuk kategori X sudah ada dan bertabrakan di tanggal ini. | Budget {kategori} untuk tanggal ini sudah ada. Ubah budget yang lama atau pilih tanggal lain. | field Kategori |
| Mohon lengkapi nama dan target! | Isi nama goal. / Isi target lebih dari Rp 0. | field masing-masing |
| Catatan tidak boleh kosong (catatan) | Isi judul atau isi catatan. | field Isi |
| Judul catatan tidak boleh kosong (agenda kalender) | Isi agenda. | field Isi |
| Kategori ini sudah ada! | Kategori “{nama}” sudah ada. | field Nama kategori |
| Tidak bisa mengambil/mengembalikan dana dari dompet yang sedang diedit! | Sumber dana tidak boleh dompet ini sendiri. | field Sumber dana |
| Sumber Dana Hilang (dialog) | Dialog: judul “Sumber dana sudah dihapus”, isi “Selisih Rp X tidak bisa dikembalikan ke mana pun. Lanjut simpan?”, tombol Batal · Simpan | dialog |
| Gagal menyimpan … / Gagal menghapus … / Gagal memuat … / Dompet not found / alert("Gagal menghapus") | {Data} gagal {disimpan/dihapus/dimuat}. Coba lagi. | toast error + tombol Coba lagi |
| Gagal menghapus transaksi (mungkin terikat data lain) | Transaksi ini masih dipakai data lain, jadi belum bisa dihapus. | toast error |
| Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan di browser. | Izinkan kamera di pengaturan browser, lalu coba lagi. Atau pilih dari galeri. | layar kamera |
| Tidak ada gambar di clipboard. / Format gambar tidak dikenali… | Tidak ada foto yang bisa ditempel. Salin foto dari galeri dulu. | toast error |
| Gagal mengekspor file Excel. | File Excel gagal dibuat. Coba lagi. | toast error |
| Saldo tidak mencukupi setelah perubahan! Saldo tersedia: Rp X | Saldo {dompet} kurang Rp {selisih} setelah perubahan ini. | field Jumlah (form ubah) |
| Saldo sumber dana tidak mencukupi! (Sisa: X, Dibutuhkan: Y) | Saldo {sumber} tinggal Rp X, butuh Rp Y. | field Sumber dana |
| Sumber dan tujuan dompet tidak boleh sama! / Sumber dana dan dompet tujuan tidak boleh sama! | Dompet tujuan harus beda dengan dompet asal. | field Ke dompet |
| Sumber dana tidak ditemukan. Mungkin sudah dihapus. / Sumber dana tidak ditemukan! | Dompet sumber sudah tidak ada. Pilih sumber lain atau simpan tanpa sumber. | field Sumber dana |
| Gagal menyimpan: {pesan} / Cek console untuk detail / alert("Gagal menyimpan") / alert("Gagal menghapus") | {Data} gagal disimpan. Coba lagi. (Detail error tetap ke console, jangan ke user) | toast error |

Ganti juga `alert()` bawaan browser dengan toast.

## 6. Kosong, loading, gagal muat

Acuan visual: `PolaState`.

| Halaman / bagian | Kosong: judul · kalimat · tombol | Loading | Gagal muat |
|---|---|---|---|
| Beranda · transaksi terakhir | Catat transaksi pertama · Pengeluaran dan pemasukan periode ini muncul di sini. · Tambah transaksi | skeleton baris ×4 | Transaksi gagal dimuat. · Coba lagi |
| Beranda · tagihan rutin | Sembunyikan kartu | skeleton tile ×3 | sembunyikan kartu |
| Beranda · piutang aktif | Sembunyikan kartu | — | sembunyikan kartu |
| Beranda · budget | Belum ada budget periode ini · Batasi kategori yang paling boros dulu. · Buat budget | skeleton bar ×2 | sembunyikan kartu |
| Riwayat | Catat transaksi pertama (sama dengan beranda) | skeleton baris ×8 | Transaksi gagal dimuat. · Coba lagi |
| Riwayat · hasil cari/filter kosong | Tidak ada yang cocok dengan “{kata}” · Coba kata lain atau hapus filter. · Hapus filter | — | — |
| Analitik | Belum ada data periode ini · Grafik muncul setelah ada transaksi. · Pilih periode lain | skeleton kartu + grafik | Analitik gagal dimuat. · Coba lagi |
| Dompet · saldo aktif | Tambah dompet pertama · Bank, e-wallet, atau tunai yang kamu pakai harian. · Tambah dompet | skeleton baris ×5 | Data dompet gagal dimuat. · Coba lagi |
| Dompet · tabungan inti | Catat aset pertama · Tabungan, emas, reksadana. Tidak dihitung di saldo aktif. · Tambah aset | skeleton tile ×3 | Data aset gagal dimuat. · Coba lagi |
| Budget | Belum ada budget periode ini · Batasi kategori yang paling boros dulu. · Buat budget | skeleton kartu ×4 | Data budget gagal dimuat. · Coba lagi |
| Goals | Mulai goal pertama · Contoh: dana darurat, laptop baru, liburan. · Tambah goal | skeleton kartu ×2 | Data goal gagal dimuat. · Coba lagi |
| Tagihan rutin · tagihan | Belum ada tagihan rutin · Netflix, internet, listrik. Diingatkan tiap bulan. · Tambah tagihan | skeleton baris ×3 | Data tagihan gagal dimuat. · Coba lagi |
| Tagihan rutin · pemasukan | Belum ada pemasukan rutin · Gaji atau uang bulanan yang datang di tanggal sama. · Tambah pemasukan | skeleton baris ×2 | sama |
| Catatan | Tulis catatan pertama · Utang, rencana belanja, atau apa pun soal uang. · Tulis catatan | skeleton kartu ×3 | Catatan gagal dimuat. · Coba lagi |
| Kalender · tanggal dipilih | Tidak ada agenda {tanggal} · Tambah pengingat untuk tanggal ini. · Tambah agenda | — | — |
| Scan · item tidak terbaca | Rincian item tidak terbaca · Total tetap bisa disimpan. Tambah item manual kalau perlu. · Tambah item | `ScanStatus` §2 | `ScanStatus` §3 (kuota) / toast |
| Kelola kategori · belum ada custom | Belum ada kategori buatan · Buat kategori untuk pengeluaran yang sering kamu catat. · (form langsung terlihat) | — | — |

Loading: tampil hanya kalau lebih dari 300 ms. Hapus semua teks "Memuat …".

## 7. Menu aksi per entitas

HP: tap baris/kartu → action sheet. Web: tombol ⋯ di baris → dropdown. Item merah selalu paling bawah, dipisah garis.

| Entitas | Tap baris (HP) | Isi menu |
|---|---|---|
| Transaksi (beranda dan Riwayat) | Tap baris = buka `UbahTransaksi` (perilaku lama, HP) / modal ubah (web). Web: ikon hapus di ujung baris. HP Riwayat: geser kiri = Ubah / Hapus | — |
| Dompet / aset | Langsung buka `UbahDompet` (perilaku lama: tap untuk edit/hapus) | Hapus ada di bawah form |
| Budget | Buka `AksiBudget` | Catat pengeluaran · Lihat transaksi kategori ini (opsional) · Ubah budget · Hapus budget |
| Goal | Tombol Nabung + Ubah di kartu (perilaku lama) | Hapus di bawah form Ubah goal |
| Tagihan belum dibayar | Buka sheet | Bayar tagihan · Ubah · Hapus |
| Tagihan sudah dibayar | Buka `AksiTagihan` | Batalkan pembayaran bulan ini · Ubah tagihan · Hapus tagihan rutin |
| Pemasukan rutin belum diterima | Buka sheet | Catat diterima · Ubah · Hapus |
| Pemasukan rutin sudah diterima | Buka sheet | Batalkan penerimaan bulan ini · Ubah · Hapus |
| Piutang aktif | Tombol Lunas di baris | — |
| Catatan | Buka form ubah | Hapus di bawah form |
| Agenda | Ikon ubah dan hapus di baris (`KalenderTanggal`) | — |
| Kategori custom | Ikon ubah dan hapus di baris (`Kategori`) | — |

## 8. Form ubah (pola)

- Judul "Ubah {jenis}", field terisi data lama, tombol utama "Simpan perubahan".
- Tombol hapus di paling bawah form: teks merah "Hapus {jenis}", membuka dialog bagian 3. Ini tambahan UI; pakai fungsi hapus yang sudah ada.
- Ubah transaksi: form sama dengan tambah. Ganti dompet → saldo dompet lama dikembalikan, dompet baru dikurangi (ikuti kode lama; ada error "Wallet lama tidak ditemukan!").
- Ubah dompet dengan sumber dana: selisih nilai diambil dari / dikembalikan ke sumber dana (ikuti kode lama). Tampilkan kalimat info seperti di `UbahDompet`. Kalau nilai tidak berubah: "Tidak ada perubahan saldo sumber."
- Tombol simpan saat proses: "Menyimpan…", lebar tetap, tap kedua diabaikan.

## 9. Risiko yang ditemukan di kode lama

Tidak untuk diperbaiki diam-diam. Tanyakan ke pemilik dulu.

1. **Hapus dompet menghapus semua transaksinya.** Analitik periode lalu ikut berubah. Desain baru memberi peringatan keras (varian B) dan saran "ubah saldo jadi Rp 0". Alternatif aman (arsipkan dompet) butuh logika baru.
2. **Hapus aset tabungan tidak menghapus transaksinya.** Transaksi transfer ke aset itu jadi menunjuk dompet yang sudah tidak ada. Cek tampilan riwayat untuk transaksi seperti ini.
3. **Hapus tagihan rutin** hanya menghapus baris `recurring_bills` di kode. Kalau tabel `bill_payments` tidak punya foreign key cascade, barisnya tertinggal tanpa induk. Cek skema Supabase. Teks dialog di bagian 3 tetap benar (transaksi pembayaran tidak ikut terhapus).
4. **Popup konfirmasi lama untuk budget, goal, aset, tagihan** hanya "Yakin ingin menghapus … ini?" tanpa nama. Tombol lama "Ya, Hapus" / "Ya, Hapus Semua". Diganti teks bagian 3.
5. **Ubah transaksi split bill menghapus lalu membuat ulang semua piutangnya** (`debts.delete().eq("original_transaction_id", id)`, lalu insert baru berstatus `pending`). Piutang yang sudah lunas kembali jadi aktif dan transaksi pelunasannya kehilangan pasangan. Kalau split dimatikan saat ubah, piutang hilang tanpa peringatan. Desain baru: saat membuka form ubah transaksi yang punya piutang lunas, tampilkan banner peringatan, atau kunci bagian split. Putuskan dengan pemilik.
6. **Kategori:** ganti nama mengubah semua transaksi lama (sesuai harapan), tapi hapus kategori tidak. Pastikan teks dialog hapus (bagian 3) tetap jujur soal ini.

## 10. Fitur baru opsional dari folder ini

Kerjakan terakhir, setelah semua di atas jalan.

| Fitur | Layar |
|---|---|
| Tombol Urungkan di toast hapus | `PolaDialog` §3 |
| Dialog "Buang perubahan?" saat keluar dari form yang sudah diisi | `PolaDialog` §4 |
| "Lihat transaksi kategori ini" dari budget | `AksiBudget` |
| Banner offline | `PolaState` §3 |
| Kartu "Piutang aktif" juga di web (kolom kanan beranda) | `PiutangAktif` |
| Field Jam di form transaksi | `Tambah`, `TambahWeb`, `UbahTransaksi` |
| Info "Rata-rata 3 periode terakhir" di form budget | belum digambar (dihapus dari `BudgetBaru`) |
| Budget berulang otomatis tiap periode | belum digambar (butuh kolom baru) |

Bukan fitur baru (hanya UI): centang "Saya paham" di varian B, tombol Hapus di dalam form ubah, toast menggantikan popup, skeleton menggantikan teks "Memuat…".

## 11. Prompt untuk Claude di VS Code

Kerjakan setelah tahap yang terkait di DESIGN.md bagian 10 selesai. Satu prompt satu sesi.

**Tahap T1 — pola global (setelah tahap 2 DESIGN.md):**
```
Baca design/DESIGN-TAMBAHAN.md bagian 0, 3, 4, 5, 6.
Acuan visual: design/screens/PolaDialog.dc.html dan PolaState.dc.html.
Buat komponen: ConfirmDialog (varian A dan B), ActionSheet (HP) + DropdownMenu (web), Toast + ToastProvider, FieldError, EmptyState, Skeleton (baris, kartu, grafik), LoadError.
Ganti popup sukses lama dan alert() dengan Toast. Ganti teks "Memuat..." dengan Skeleton.
Jangan ubah logika hapus/simpan. Tunjukkan rencana dulu dan tunggu persetujuan saya.
Selesai: daftar komponen dan tempat lama yang sudah diganti.
```

**Tahap T2 — dialog hapus per entitas:**
```
Baca design/DESIGN-TAMBAHAN.md bagian 3 dan 9.
Untuk setiap baris tabel bagian 3, cari fungsi hapus di kode (cari teks judul lama seperti "Hapus Dompet?").
Ganti dialognya dengan ConfirmDialog memakai teks baru. Perilaku data harus tetap sama persis.
Untuk risiko di bagian 9 nomor 2 dan 3, cek skema Supabase (foreign key) dan laporkan ke saya. Jangan ubah perilakunya.
Tunjukkan rencana dulu dan tunggu persetujuan saya.
Selesai: tabel entitas → file → sudah/belum.
```

**Tahap T3 — fitur lama yang terlewat (bersama halaman induknya):**
```
Baca design/DESIGN-TAMBAHAN.md bagian 1, 2, 7, 8.
Kerjakan layar: [PILIH: PiutangAktif + LunasiPiutang | Onboarding1 + Onboarding2 | AksiBudget + CatatBudget | AksiTagihan + BatalBayar | KalenderTanggal | ScanCek + ScanStatus | VoiceHasil + VoiceStatus | UbahTransaksi + UbahDompet + HapusDompet + HapusTransaksiPiutang].
Acuan visual di design/screens/. Versi web pakai design/screens/ModalWeb.dc.html.
Pakai logika yang sudah ada. Jangan tambah fitur di bagian 10 kecuali saya minta.
Tunjukkan rencana dulu dan tunggu persetujuan saya.
```
