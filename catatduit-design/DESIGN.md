# CatatDuit — Spesifikasi Redesign (v1, Oktober 2026)

Dokumen ini adalah sumber kebenaran untuk redesign tampilan CatatDuit di HP dan web.
Ditulis supaya Claude (atau developer lain) bisa langsung mengimplementasikan tanpa menebak.

## 0. Cara pakai folder ini

```
design/
├── DESIGN.md              ← dokumen ini (baca pertama)
├── tokens/catatduit.css   ← token warna, radius, font + kelas komponen
└── screens/*.dc.html      ← mockup per layar (HTML referensi, bukan kode produksi)
```

Urutan kerja yang disarankan untuk Claude:

1. Baca bagian 1–5 dokumen ini (prinsip, token, layout, navigasi, komponen).
2. Port `tokens/catatduit.css` ke sistem styling project (CSS variables / Tailwind theme). Nama token dipertahankan.
3. Bangun komponen dasar (bagian 5) sebelum menyentuh halaman.
4. Kerjakan halaman satu per satu sesuai bagian 7. Untuk tiap halaman, buka file `screens/` yang disebut sebagai acuan visual.
5. Jangan ubah logika bisnis (perhitungan saldo, piutang, talangan, filter periode). Redesign ini hanya tampilan, struktur navigasi, dan alur input.

Catatan tentang file `screens/*.dc.html`:
- Ini format mockup canvas. Bagian yang penting: markup di dalam `<x-dc>` dan kelas CSS dari `catatduit.css`.
- `{{ ... }}`, `<sc-if>`, `<sc-for>`, dan `<script type="text/x-dc">` adalah sintaks mockup. Abaikan, terjemahkan ke komponen/state di framework project.
- Angka di mockup adalah data contoh. Ambil data asli dari store/API yang sudah ada.
- Ikon di mockup adalah SVG inline sederhana. Di project, pakai library ikon yang sudah ada (mis. Lucide) dengan ikon yang paling mirip.

## 0.5 Status fitur: lama vs baru

Redesign ini menjaga **semua fitur web lama**. Tabel di bawah dipakai untuk cek tidak ada yang hilang.

### Fitur yang sudah ada (wajib tetap jalan)

| Fitur lama | Di desain baru | File acuan |
|---|---|---|
| Ringkasan: total aset, saldo aktif, pemasukan, pengeluaran + % vs periode lalu | Hero + kartu pemasukan/pengeluaran | `Main`, `Web` |
| Tombol mata sembunyikan nominal | Ikon mata di hero dan header web | `Main`, `Web` |
| Ikon info di tiap kartu metrik (penjelasan definisi) | Tooltip/popover dari ikon info kecil di samping label | `Main`, `Web` (lihat 7.1) |
| Filter periode (Bulanan: pilih tahun + bulan / Custom: dari–sampai, rentang custom tersimpan) + panah sebelum/berikut + Reset ke bulan ini | Chip periode dengan panah + sheet Filter dan periode | `Main`, `Periode` |
| Ringkasan arus kas (tanpa piutang, keluar + transfer, sisa, % + status) | Kartu Ringkasan arus kas | `Main`, `Web` |
| Grafik Arus Kas & Pertumbuhan (Jan–Des) | Grafik arus kas di beranda web dan Analitik. Tampilkan 12 bulan di web, 6 di HP | `Web`, `Analitik*` |
| Aksi cepat HP: Masuk, Keluar, Transfer, Anggaran | Tombol `+` di bottom nav (buka form, pilih tipe di tab). Anggaran ada di Lainnya | `Main`, `Tambah` |
| Tombol `+` global (web) membuka modal tambah transaksi | Tombol "Tambah transaksi" di header web → modal | `TambahWeb` |
| Form transaksi: nominal + `+000` / chip nominal cepat, tanggal, dompet, kategori wajib, catatan | Sama | `Tambah`, `TambahWeb` |
| Split bill: daftar Nama + nominal, "Tambah orang" | Sama | `Tambah` (nyalakan toggle) |
| Talangan + "Nama orang yang ditalangi (opsional)" | Sama | `Tambah` |
| Pemasukan piutang + "Nama peminjam (opsional)" | Sama | `Tambah` (tab Pemasukan) |
| Transfer/topup: sumber, tujuan, nominal, biaya admin, total keluar | Sama | `Tambah` (tab Transfer) |
| Kelola kategori custom: pilih untuk edit/hapus, buat baru (nama, ikon, warna) | Halaman Kelola kategori | `Kategori` |
| Riwayat transaksi + Export ke Excel + Refresh data + Hapus | Halaman Riwayat, sheet Export, konfirmasi hapus, tarik-untuk-refresh (HP) / ikon refresh (web) | `Riwayat*`, `Export`, `HapusKonfirmasi` |
| Tagihan & pemasukan rutin: tab, peringatan jatuh tempo, status terlewat/lunas | Halaman Tagihan rutin | `Tagihan*` |
| Menu ⋯ tagihan: Bayar Tagihan (jumlah default, tanggal, dompet), Edit, Hapus | Tombol Bayar → sheet; tekan lama/⋯ → Edit, Hapus | `Tagihan*`, `BayarTagihan` |
| Form tambah tagihan rutin / pemasukan rutin (nama, jumlah, kategori, tanggal pertama) | Sheet | `TagihanBaru` |
| Kalender di beranda (jam berjalan, tanggal hari ini, grid bulan, libur nasional, tagihan, agenda per tanggal) | Tetap di beranda, kartu Kalender; detail tanggal di `KalenderTanggal` | `Main`, `Web`, `KalenderTanggal`, `AgendaBaru` |
| Catatan (judul opsional, isi, hitung karakter, warna kartu bergilir otomatis, edit, hapus) | Kartu catatan polos, urut terakhir diubah | `Catatan*`, `CatatanBaru` |
| Dompet: total, kartu per dompet, edit, hapus, tambah (nama, tipe, kategori aktif/tabungan, nilai, sumber dana) | Tab Saldo aktif | `Dompet*`, `DompetBaru` |
| Tabungan inti (aset) | Tab Tabungan inti di halaman Dompet | `DompetWeb` |
| Budget: periode (filter Bulanan/Custom), buat budget (tanggal mulai/selesai, kategori, batasan) | Sama | `Budget*`, `BudgetBaru` |
| Goals: kartu %, terkumpul/target, Edit, Nabung, tambah target (nama, target, terkumpul, batas waktu) | Sama | `Goals*`, `GoalBaru`, `Nabung` |
| Analitik: total, pengeluaran terbesar, aktivitas terakhir, spending insights, perbandingan periode + per kategori, grafik, per sumber dana, per dompet | Sama, disusun ulang | `Analitik*` |
| Scan struk: Foto, Galeri, Paste dari clipboard | Sama | `Scan*` |
| Voice input + contoh kalimat | Sama | `Voice*` |
| Mode gelap/terang | Toggle di sidebar dan Lainnya | `Lainnya`, sidebar |
| Sembunyikan sidebar (web) | Sidebar ringkas 72px (ikon saja) | bagian 3 |

Aplikasi lama **tidak punya halaman login** (`/login` 404). Jangan tambahkan login sebagai bagian redesign.

### Fitur baru (opsional, butuh logika baru)

Kerjakan setelah semua fitur lama jalan. Kalau tidak dikerjakan, sembunyikan elemennya.

| Fitur baru | Muncul di |
|---|---|
| Ubah (edit) transaksi | Geser baris di `Riwayat`, ikon pensil di `RiwayatWeb` |
| Halaman Riwayat terpisah dengan pencarian, filter tipe/kategori/dompet, paginasi | `Riwayat*` |
| Halaman daftar Tagihan rutin + kalender tagihan | `Tagihan*` (di app lama hanya widget beranda + form `/recurring`) |
| Ikon notifikasi | `Main` |
| Info "aman dipakai per hari" di Budget (rata-rata 3 periode dan budget berulang belum digambar, lihat DESIGN-TAMBAHAN bagian 10) | `Budget*` |
| Saran "nabung ± Rp X per bulan" | `Goals*` |
| Nabung memotong saldo dompet | `Nabung` (field opsional) |
| Tandai goal selesai dan arsipkan | `Goals*` |
| Layar "Cek hasil scan" sebelum simpan | `ScanHasil`, `ScanWeb`. **Cek dulu alur scan yang sekarang**; kalau sudah ada layar konfirmasi, ikuti isinya dan pakai tampilan ini |
| Kartu hasil voice sebelum simpan | `Voice*`. Sama, cek alur lama dulu |
| Ringkasan isi file export (4 sheet) sebelum unduh | `Export` (app lama langsung export Excel, tanpa pilihan) |
| Menu "Kelola kategori" dan "Export ke Excel" di Lainnya | `Lainnya` |

## 1. Prinsip desain

1. **Satu aksi utama per layar.** Tombol aksen (`.btn`) hanya satu per layar. Sisanya `.btn-2` atau `.link`.
2. **Input transaksi secepat mungkin.** Transaksi rutin harus selesai ≤ 3 tap: buka form → pilih kategori → simpan. Nominal, tanggal, dan dompet punya default pintar.
3. **Angka dulu, dekorasi belakangan.** Tidak ada gradasi, efek kaca, ilustrasi kartun, atau emoji di UI. Kedalaman dari border tipis, bukan bayangan tebal.
4. **Warna punya arti.**
   - Pengeluaran: warna teks biasa (`--text`), tanpa merah, tanpa tanda minus.
   - Pemasukan: `--income` dengan tanda `+`.
   - Transfer: `--text-2` (abu), netral.
   - Merah (`--danger`) hanya untuk peringatan: budget lewat, tagihan terlewat, tombol hapus.
5. **HP dan web satu produk.** Komponen sama, susunan beda (lihat bagian 3).

## 2. Token

Semua token ada di `tokens/catatduit.css` (light + dark lewat `[data-theme="dark"]`).

| Token | Light | Dark | Dipakai untuk |
|---|---|---|---|
| `--bg` | #F3F6F5 | #081412 | Latar halaman |
| `--surface` | #FFFFFF | #0F1E1B | Kartu, panel, nav |
| `--surface-2` | #F7FAF9 | #132522 | Latar input, kartu sekunder |
| `--border` | #E3E9E7 | #1E302C | Garis kartu dan input |
| `--divider` | #EEF2F1 | #172925 | Pemisah baris, track progress |
| `--text` | #0F1F1C | #E6EEEC | Teks utama, nominal pengeluaran |
| `--text-2` | #5F6B69 | #9FB0AC | Label, metadata |
| `--accent` | #0F766E | #2DD4BF | Tombol utama, menu aktif, progress |
| `--accent-tint` | #E6F4F1 | #0F2E2A | Latar item terpilih |
| `--income` | #4D7C0F | #A3E635 | Nominal pemasukan (teks) |
| `--income-chart` | #84CC16 | #A3E635 | Batang pemasukan di grafik |
| `--danger` | #DC2626 | #F87171 | Peringatan dan hapus |
| `--warn` / `--warn-tint` | #92400E / #FEF3C7 | #FCD34D / #3A2A06 | Jatuh tempo dekat, kolom scan kurang yakin |

Radius: hero 24, kartu 20, tile 16, tombol 14, input 12.
Font: **Plus Jakarta Sans** (400, 500, 600, 700) dari Google Fonts. Semua angka `font-variant-numeric: tabular-nums`.
Jarak: kelipatan 4. Gutter HP 20px. Jarak antar section 16px (HP) / 20px (web).

Warna kategori: kelas `.c-<kategori>` di CSS (latar pucat + warna ikon). Mapping kategori → kelas ada di bagian 6.

## 3. Layout dan breakpoint

| Lebar | Navigasi | Konten |
|---|---|---|
| < 768px (HP) | Bottom nav 5 slot + tombol `+` tengah (`.nav`, `.fab`) | 1 kolom, gutter 20px, padding bawah 116px agar tidak tertutup nav |
| 768–1023px (tablet) | Sidebar ringkas 72px, hanya ikon + tooltip | Grid 2 kolom |
| ≥ 1024px (desktop) | Sidebar penuh 248px (`.side`) | Maks lebar konten 1240px, baris kartu pakai flex-wrap |

Form dan detail:
- HP: form transaksi = halaman penuh dengan tombol simpan menempel di bawah (`.sticky-foot`). Form kecil lain (tambah dompet, buat budget, nabung) = bottom sheet (`.sheet`).
- Web: form transaksi = modal tengah (`.modal`). Form kecil lain = panel kanan (`.panel`) di halaman yang sama.

Wajib: hapus `maximum-scale=1, user-scalable=no` dari meta viewport (zoom harus bisa).

## 4. Navigasi dan peta halaman

### Bottom nav (HP)
`Beranda` · `Analitik` · **`+`** · `Dompet` · `Lainnya`

### Sidebar (web)
- Beranda, Riwayat, Analitik, Dompet & tabungan
- Grup **Rencana**: Budget, Goals, Tagihan rutin, Catatan
- Grup **Catat cepat**: Scan struk, Voice input
- Bawah: Mode gelap, profil

### Peta route

| Route | Halaman | Status |
|---|---|---|
| `/` | Beranda | Diubah |
| `/transactions` | Riwayat transaksi | **Baru** (sebelumnya "Lihat semua" lari ke Analitik) |
| `/transaction?type=pengeluaran\|pemasukan\|topup` | Form tambah transaksi | Diubah |
| `/analytics` | Analitik | Diubah |
| `/wallets` | Dompet & tabungan, tab `aktif` / `tabungan` | Digabung |
| `/main-savings` | Redirect ke `/wallets?tab=tabungan` | Dihapus sebagai halaman |
| `/budgets` | Budget | Diubah |
| `/goals` | Goals | Diubah |
| `/recurring` | Tagihan rutin (daftar). Form tambah jadi sheet/modal | Diubah (sebelumnya route ini hanya halaman form tambah) |
| `/notes` | Catatan (judul + isi) | Kalender tetap di beranda, tidak dipindah |
| `/scan-receipt` | Scan struk | Diubah, ada layar "cek hasil" |
| `/voice-transaction` | Voice input | Diubah, ada kartu hasil sebelum simpan |
| `/more` | Menu lainnya (HP saja) | **Baru** |

## 5. Komponen dasar

Nama kelas mengikuti `catatduit.css`. Di React/Vue/Svelte, jadikan komponen dengan nama di kolom kedua.

| Kelas | Komponen | Catatan |
|---|---|---|
| `.hero` | `HeroBalance` | Kartu saldo teal solid. Berisi label, angka `.num-xl`, tombol mata (sembunyikan nominal) |
| `.card`, `.card-flush` | `Card` | `card-flush` untuk daftar baris (padding samping saja) |
| `.tile` | `Tile` | Kotak kecil (tagihan, dompet di grid) |
| `.row` | `TransactionRow` | Ikon kategori 40px, judul `.t`, meta `.meta`, nominal `.amt` kanan |
| `.ic`, `.ic-s`, `.ic-l` | `CategoryIcon` | 40 / 32 / 48px, pakai kelas `.c-<kategori>` |
| `.btn`, `.btn-2`, `.btn-danger`, `.link` | `Button` variant primary/secondary/danger/link | Tinggi 48 / 44 |
| `.icon-btn` (+ `.ghost`) | `IconButton` | 44×44, wajib `aria-label` |
| `.fab` | `FabAdd` | Tombol `+` di tengah bottom nav |
| `.seg` | `SegmentedControl` | Tab 2–4 pilihan (tipe transaksi, tab dompet) |
| `.chip` (+ `.on`) | `Chip` | Pilihan cepat: nominal cepat, dompet, filter |
| `.badge` `.b-ok/.b-warn/.b-bad/.b-neutral` | `StatusBadge` | Status saja (lunas, jatuh tempo, terlewat). Bukan untuk dekorasi |
| `.banner.warn/.info` | `Banner` | Satu kalimat peringatan atau info |
| `.bar` (+ `.thick`, `.over`) | `ProgressBar` | `.over` = merah saat lewat batas |
| `.field`, `.input`, `.amount-box` | `Field`, `TextInput`, `AmountInput` | Label selalu terlihat di atas input. Nominal pakai `inputmode="numeric"` |
| `.toggle-row` + `.switch` | `ToggleRow` | Opsi ya/tidak dengan penjelasan satu baris |
| `.sheet` + `.scrim` + `.grabber` | `BottomSheet` | HP |
| `.modal-scrim` + `.modal` | `Modal` | Web. Esc menutup, Enter menyimpan |
| `.panel` | `SidePanel` | Form di sisi kanan halaman web |
| `.nav` / `.side` | `BottomNav` / `Sidebar` | |
| `.tbl` dalam `.tbl-box` | `DataTable` | Web. Scroll horizontal di layar sempit |

## 6. Aturan konten

### Format angka
- Daftar transaksi dan detail: lengkap, `Rp 35.000` (pakai `Intl.NumberFormat('id-ID')`).
- Kartu kecil, tile, sumbu grafik: singkat, `Rp 8,5jt`, `Rp 350rb`.
- Pemasukan: `+Rp 8.500.000`. Pengeluaran: tanpa tanda.
- Mode sembunyikan nominal: tampilkan `Rp ••••••`. Ikuti kode lama: nominal tersembunyi setiap app dibuka, dibuka lewat tombol mata. Tidak ada pengaturan.

### Kategori → kelas warna

| Kategori | Kelas | | Kategori | Kelas |
|---|---|---|---|---|
| Kebutuhan dapur | `c-dapur` | | Gaji | `c-gaji` |
| Makan di luar | `c-makan` | | Bonus & hadiah | `c-bonus` |
| Transportasi | `c-transport` | | Investasi | `c-investasi` |
| Tempat tinggal | `c-rumah` | | Penjualan | `c-belanja` |
| Tagihan | `c-tagihan` | | Piutang | `c-piutang` |
| Belanja | `c-belanja` | | Transfer / topup | `c-transfer` |
| Kesehatan | `c-kesehatan` | | Dompet bank | `c-bank` |
| Cicilan & utang | `c-cicilan` | | Dompet e-wallet | `c-ewallet` |
| Pribadi & hiburan | `c-hiburan` | | Dompet tunai | `c-cash` |
| Edukasi & donasi | `c-edukasi` | | Aset (emas, arisan) | `c-aset` |
| Lainnya + kategori custom | `c-lain` | | | |

### Teks
- Huruf kalimat (sentence case), bukan HURUF BESAR semua. Label lama seperti "TOTAL SEMUA UANG" diganti.
- Tombol diawali kata kerja: "Simpan pengeluaran", "Tambah dompet", "Bayar".
- Ganti label yang menyesatkan:
  - "Total Semua Uang" → **"Aset tersimpan (tabungan inti)"**
  - "Hemat Yuk !!!" → sapaan "Halo, Eko" + tanggal
  - "HAPUS" di tiap baris → aksi geser (HP) / ikon tempat sampah (web) dengan konfirmasi

### State wajib di setiap daftar
- **Loading**: skeleton sesuai bentuk baris/kartu (bukan teks "Memuat…"). Tampilkan hanya jika lebih dari 300 ms.
- **Kosong**: judul ajakan + 1 kalimat + 1 tombol. Contoh Budget: "Belum ada budget periode ini" · "Batasi kategori yang paling boros dulu." · `Buat budget`.
- **Error**: "Data gagal dimuat. Coba lagi." + tombol `Coba lagi`.

## 7. Spesifikasi per halaman

Format tiap halaman: acuan file, isi HP (urutan atas ke bawah), perbedaan web, interaksi.

### 7.1 Beranda — `Main.dc.html`, `Web.dc.html`
HP:
1. Header: avatar inisial, "Halo, {nama}", tanggal hari ini. Tidak ada tombol notifikasi (app lama tidak punya).
2. Chip periode aktif (contoh "25 Sep – 25 Okt 2026" untuk Custom, "Oktober 2026" untuk Bulanan) diapit panah sebelum/berikut. Tap chip → sheet `Periode` (Bulanan / Custom, Reset ke bulan ini).
3. `HeroBalance`: saldo aktif + jumlah dompet; dua pill Pemasukan/Pengeluaran dengan % perubahan vs periode lalu; baris bawah "Aset tersimpan" → link ke tab Tabungan.
4. Kartu **Ringkasan arus kas**: badge status ("Masih terkendali" / "Hati-hati" ≥ 80% / "Lewat" > 100%), kalimat "Kamu sudah pakai X% dari pemasukan", progress, tiga angka: Pemasukan (tanpa piutang), Dipakai (keluar + transfer), Sisa.
5. **Tagihan rutin**: banner jika ada yang jatuh tempo ≤ 3 hari, lalu 3 tile teratas dengan badge status. Link "Kelola" → `/recurring`.
6. **Budget bulan ini**: 2 budget dengan persentase tertinggi.
7. **Kalender** (sudah ada di app lama, tetap di beranda): tanggal hari ini + jam berjalan (detik ikut update), panah bulan, grid bulan dengan titik penanda (libur nasional, tagihan, pemasukan rutin, agenda), tanggal dipilih + "+ Agenda" + daftar agenda tanggal itu ("Tidak ada agenda tanggal ini" kalau kosong). Detail lengkap (tagihan Bayar/Terima/Batalkan, ubah/hapus agenda) di `KalenderTanggal`.
8. **Catatan terbaru**: 1 catatan.
9. **Transaksi terakhir** (judul lama "Riwayat Transaksi"): baris terbaru periode ini, badge Piutang / Talangan / Split Bill. Ikon Export ke Excel dan Muat ulang di header. **Tap baris = ubah transaksi** (perilaku lama): di HP buka halaman `UbahTransaksi` (`/transaction?type=…&edit={id}`), di web buka modal ubah di beranda. Link "Lihat semua" → `/transactions` (app lama ke `/analytics`; halaman Riwayat = baru).

Ikon info kecil di samping label metrik membuka penjelasan definisi (pakai teks dari app lama, contoh: "Total saldo dari dompet bertipe Aktif, uang siap dipakai harian").

Web: sidebar + baris 1 (hero, kartu pemasukan, kartu pengeluaran), baris 2 (arus kas, tagihan rutin), baris 3 (grafik arus kas 6 periode, budget), baris 4 (transaksi terakhir, catatan terbaru, kalender). Baris transaksi web: klik baris = modal ubah transaksi; ikon hapus merah di ujung baris (app lama: tombol "Hapus" per baris, saat proses "Menghapus…") membuka dialog hapus bagian 3 DESIGN-TAMBAHAN. Tombol "Tambah transaksi" di kanan atas membuka modal.

Dihapus dari beranda: duplikasi kartu metrik. Jam digital dan kalender **tetap** (masuk kartu Kalender).

### 7.2 Tambah transaksi — `Tambah.dc.html` (interaktif), `TambahWeb.dc.html`
- Header: tutup (X), judul sesuai tipe, tombol ikon Scan struk dan Voice.
- `SegmentedControl`: Pengeluaran / Pemasukan / Transfer. Default dari query `type`.
- `AmountInput` besar + chip nominal cepat `+10rb +50rb +100rb +500rb +1jt` + `Reset`. Pakai keyboard numerik bawaan HP (`inputmode="numeric"`), bukan numpad custom.
- Tanggal (default hari ini). Field Jam di desain = fitur baru opsional; app lama hanya punya tanggal.
- Pengeluaran / Pemasukan:
  - Dompet: chip horizontal, default dompet terakhir dipakai, tampilkan saldo kecil di chip.
  - Kategori: grid 4 kolom ikon + label. Urutan sama dengan app lama: kategori bawaan dulu, lalu kategori custom. Item terakhir "Kelola kategori" → halaman `Kategori`.
  - Pengeluaran: `ToggleRow` "Ada yang nitip bayar?" (split bill → daftar Nama + nominal + "Tambah orang", sisa = bagian kamu, bagian teman jadi piutang) dan "Ini talangan?" (tidak dihitung pengeluaran; saat aktif muncul field "Nama orang yang ditalangi (opsional)").
  - Pengeluaran: kartu dampak budget (sudah ada di app lama) muncul di bawah kategori kalau kategori itu punya budget aktif di tanggal transaksi. Isi: "Budget {kategori}", status "Dalam batas" / "Limit terlampaui", "Terpakai + baru", bar (kuning di atas 80%, merah kalau lewat), "Sisa: Rp X". Rumus ikuti kode lama (lihat DESIGN-TAMBAHAN bagian 1).
  - Pemasukan: `ToggleRow` "Ini pengembalian piutang?" (tidak dihitung pemasukan; saat aktif muncul field "Nama peminjam (opsional)"). Logika sama dengan toggle "Ini adalah piutang?" di app lama, hanya labelnya diperjelas.
- Transfer: Dari dompet → tombol tukar → Ke dompet, nominal, biaya admin opsional, ringkasan "Total keluar dari {dompet}".
- Catatan opsional.
- Tombol simpan menempel di bawah, label sesuai tipe. Setelah simpan: toast "Tersimpan" + kembali ke halaman asal.
- Validasi: kategori wajib (kecuali transfer), nominal > 0. Pesan error di bawah field, muncul saat simpan ditekan.

Web: modal 760px, dua kolom (kiri: tipe, nominal, tanggal, dompet, catatan; kanan: kategori, toggle). Footer: hint "Enter simpan, Esc tutup", Batal, Simpan.

### 7.3 Riwayat transaksi (baru) — `Riwayat.dc.html`, `RiwayatWeb.dc.html`
HP: kembali + judul + Export; pencarian; chip filter (Semua, Pengeluaran, Pemasukan, Transfer, Piutang, Talangan); ringkasan masuk/keluar periode; daftar dikelompokkan per tanggal dengan total harian; geser baris ke kiri → Ubah / Hapus (hapus minta konfirmasi); tombol "Muat transaksi sebelumnya" (atau infinite scroll).
Web: 4 kartu ringkas (masuk, keluar, selisih, jumlah transaksi); bar filter (cari, chip tipe, dropdown kategori dan dompet); tabel kolom Tanggal · Keterangan · Kategori · Dompet · Nominal · Aksi (ikon ubah, ikon hapus); paginasi.

### 7.4 Analitik — `Analitik.dc.html`, `AnalitikWeb.dc.html`
Urutan: pilihan periode (Periode ini / Periode lalu / 3 periode / Pilih tanggal) + teks pembanding; ringkasan (pemasukan, pengeluaran, sisa, saving rate di web); **Insight** 3 kartu teks otomatis (saving rate, kategori terbesar, perubahan terbesar) tanpa emoji; pengeluaran per kategori (bar horizontal + % perubahan); grafik arus kas 6 periode; tabel perbandingan periode (termasuk per kategori di web); 5 pengeluaran terbesar; transaksi per dompet (bar komposisi + masuk/keluar + jumlah transaksi).
Tidak dipakai: pie chart (diganti bar horizontal).

### 7.5 Dompet & tabungan — `Dompet.dc.html`, `DompetBaru.dc.html`, `DompetWeb.dc.html`
- Tab `Saldo aktif` / `Tabungan inti` (menggantikan halaman Tabungan terpisah).
- Hero total per tab. HP: daftar dikelompokkan Bank / E-wallet / Tunai, tiap baris: ikon tipe, nama, "Dipakai {kapan}", saldo. Banner info: aset tabungan inti tidak dihitung di saldo aktif.
- Form tambah dompet (sheet di HP, panel di web): Nama, Tipe (Bank / E-wallet / Tunai), Masuk ke (Saldo aktif / Tabungan inti, dua kartu pilihan dengan penjelasan), Saldo saat ini, Sumber dana opsional. Kalau sumber dana dipilih, saldo awal dipotong dari dompet sumber dan dicatat "Isi saldo awal dari {sumber}" (perilaku lama).
- Web: grid kartu dompet untuk kedua kelompok sekaligus + panel form di kanan.
- Perbaiki data: label tipe harus konsisten (di data lama ada OVO bertipe bank dan Mandiri bertipe e-wallet). Tampilkan tipe dari field `type`, jangan dari nama.

### 7.6 Budget — `Budget.dc.html`, `BudgetBaru.dc.html`, `BudgetWeb.dc.html`
- Chip periode (filter Budget sendiri: Bulanan / Custom, disimpan di `localStorage`).
- Kartu total: terpakai / total, progress, sisa, "Aman dipakai ± Rp X per hari" = sisa ÷ hari tersisa.
- Banner jumlah budget lewat batas / hampir habis (≥ 80%).
- Kartu per budget: ikon kategori, nama, "Rp terpakai dari Rp batas", progress (merah jika lewat), badge sisa atau lewat. Urut: lewat → hampir habis → aman.
- Form buat budget: kategori (semua kategori pengeluaran; bentrok ditolak), batas, tanggal mulai/selesai (default periode yang sedang dipilih di halaman Budget). Tidak ada field lain.

### 7.7 Goals — `Goals.dc.html`, `Nabung.dc.html`, `GoalsWeb.dc.html`
- Hero total terkumpul dari semua goal.
- Kartu goal: nama, target tanggal (opsional) + sisa waktu, persen, progress, terkumpul / target, saran "Nabung ± Rp X per bulan supaya tepat waktu" (jika ada tanggal target), tombol Nabung + Ubah. Goal tercapai: badge "Tercapai", tombol "Tandai selesai dan arsipkan".
- Sheet Nabung: jumlah + chip cepat, pratinjau "Setelah nabung: Rp X · Y%". Pilih dompet sumber = **opsional, fitur baru**; kosong = perilaku lama (cuma menambah angka terkumpul).
- Form tambah/ubah goal: `GoalBaru` (nama, target dana, sudah terkumpul, batas waktu opsional). Mode ubah: judul "Ubah goal" + tombol Hapus goal.

### 7.8 Tagihan rutin (baru) — `Tagihan.dc.html`, `TagihanWeb.dc.html`
- Tab Tagihan / Pemasukan (rutin).
- Ringkasan: total per bulan, belum dibayar.
- Kelompok "Perlu dibayar" (terlewat dulu, lalu yang terdekat) dengan tombol **Bayar** yang membuka sheet `BayarTagihan` (jumlah default dari tagihan, tanggal, dompet; fitur ini sudah ada di app lama). Menu ⋯ atau tekan lama: Edit, Hapus. Tombol `+` → sheet `TagihanBaru`. Kelompok "Sudah dibayar bulan ini".
- Kalender bulan dengan warna status (lunas, akan datang, terlewat, pemasukan).
- Status: terlewat (`b-bad`), ≤ 3 hari (`b-warn`), lunas (`b-ok`).

### 7.9 Catatan — `Catatan.dc.html`, `CatatanWeb.dc.html`
- HP: pencarian; kartu catatan (judul, isi multi-baris dengan `white-space: pre-line`, tanggal). Catatan tidak punya tipe atau warna. Tap kartu → form ubah (sama dengan `CatatanBaru`, judul "Ubah catatan", ada Hapus). Kalender dan agenda tidak di halaman ini (ada di beranda).
- Web: pencarian + grid catatan.

### 7.10 Scan struk — `Scan.dc.html`, `ScanHasil.dc.html`, `ScanWeb.dc.html`
- Layar awal: area unggah, tombol Ambil foto (utama), Galeri, Tempel (clipboard), tips foto, daftar scan terakhir.
- Layar **Cek hasil** (wajib sebelum simpan): thumbnail struk, banner jumlah item terbaca, field Keterangan, Total, Tanggal, Jam, Kategori (saran otomatis), Dompet, rincian item. Field yang kurang yakin diberi latar `--warn-tint`.
- Web: unggah drag-and-drop di kiri, hasil + tabel item di kanan.

### 7.11 Voice input — `Voice.dc.html` (interaktif), `VoiceWeb.dc.html`
- Tombol mic besar. State: siap → mendengarkan (warna merah + ring) → hasil.
- Contoh kalimat sebagai chip.
- Kartu hasil: transkrip "Kamu bilang …" + rincian (Jenis, Jumlah, Kategori, Dompet, Waktu). Tombol "Ubah dulu" (buka form terisi) dan "Simpan".
- Web: tahan spasi untuk bicara.

### 7.12 Menu lainnya (HP) — `Lainnya.dc.html`
Kartu profil (nama), grid Rencana (Budget, Goals, Tagihan rutin), grid Catat cepat (Scan, Voice, Catatan), daftar pengaturan (Riwayat transaksi, Kelola kategori, Export ke Excel, Mode gelap).

### 7.13 Komponen & token — `Komponen.dc.html`
Lembar referensi visual semua token dan komponen di bagian 2 dan 5.

### 7.14 Form dan dialog tambahan
Semua form di bawah: **HP = bottom sheet**, **web = modal 480px atau panel kanan** dengan field yang sama.

| Form | File | Field / isi |
|---|---|---|
| Filter dan periode | `Periode` | Tab Bulanan (tahun + grid 12 bulan) / Custom (dari, sampai; rentang tersimpan). Tombol Reset ke bulan ini + Terapkan. Dipakai di Beranda, Analitik, Riwayat. Budget punya filter sendiri dengan bentuk sama |
| Kelola kategori | `Kategori` | Tab Pengeluaran/Pemasukan, daftar kategori custom (ubah, hapus), form buat baru: nama, 12 ikon, 8 warna, pratinjau. Kategori bawaan tidak bisa diubah |
| Export ke Excel | `Export` | Periode (ikut filter aktif, bisa diubah), daftar 4 sheet (Transaksi, Per kategori, Rekap per rentang, Dompet), tombol Unduh .xlsx |
| Konfirmasi hapus | `HapusKonfirmasi` | Dialog dengan nama dan nominal transaksi, dampak ke saldo dompet, Batal + "Hapus transaksi" (merah). Pola sama untuk hapus dompet, budget, goal, catatan, tagihan, kategori. Setelah hapus: toast "Transaksi dihapus" |
| Tambah tagihan / pemasukan rutin | `TagihanBaru` | Tab Tagihan rutin / Pemasukan rutin, nama, jumlah, kategori (default Tagihan / Gaji), tanggal pertama + teks "Berulang tiap bulan di tanggal yang sama" |
| Bayar tagihan | `BayarTagihan` | Jumlah (default nominal tagihan), tanggal, dompet sumber, Batal + "Bayar Rp X" |
| Tulis / ubah catatan | `CatatanBaru` | Judul (opsional, kosong jadi "Catatan Baru"), isi + hitung karakter. Judul dan isi tidak boleh kosong dua-duanya |
| Tambah agenda | `AgendaBaru` | Tanggal di header, isi, tipe Catatan / Pengingat (label saja), warna label: biru, hijau, kuning, merah, ungu (default biru) |
| Tambah / ubah goal | `GoalBaru` | Nama, target dana, sudah terkumpul, batas waktu (opsional) |
| Tambah / ubah dompet | `DompetBaru` | Lihat 7.5. Tap baris dompet = buka form ubah (ada tombol Hapus dompet) |

## 8. Aksesibilitas (wajib)
- Zoom tidak dikunci (lihat bagian 3).
- Target sentuh ≥ 44×44 px.
- Kontras teks ≥ 4.5:1. `--income` sengaja `#4D7C0F` (bukan `#65A30D`) agar lolos di teks kecil.
- Semua input punya `<label>` yang terlihat. Placeholder hanya contoh isi.
- Tombol ikon wajib `aria-label`.
- Warna bukan satu-satunya pembeda: status selalu punya teks (Lunas, Terlewat), pemasukan punya tanda `+`.
- Modal/sheet: fokus terkunci di dalam, Esc menutup, fokus kembali ke pemicu.
- Hormati `prefers-reduced-motion`: animasi sheet/modal jadi fade saja.

## 9. Gerak
- Durasi: 150 ms (hover, chip), 220 ms (sheet, modal masuk), 180 ms (keluar).
- Easing: `cubic-bezier(.2,.8,.2,1)`.
- Yang boleh dianimasikan: `opacity`, `transform`. Jangan animasikan tinggi/lebar.

## 10. Urutan implementasi yang disarankan
1. Token + font + hapus kunci zoom.
2. Komponen dasar (bagian 5) + layout shell (BottomNav, Sidebar, FAB).
3. Form tambah transaksi (paling sering dipakai).
4. Beranda.
5. Riwayat transaksi (halaman baru).
6. Dompet & tabungan (gabung dua halaman + redirect).
7. Budget, Goals, Tagihan rutin.
8. Analitik.
9. Catatan, Scan struk, Voice input, Menu lainnya.
10. Dark mode (token sudah ada di CSS).
11. Fitur baru opsional dari bagian 0.5, satu per satu.

Form di 7.14 dikerjakan bersama halaman induknya (misal `TagihanBaru` dan `BayarTagihan` bersama Tagihan rutin).
