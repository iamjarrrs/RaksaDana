# PRD (Final): Sistem Keuangan Fleksibel & Pelacak Utang

*Versi 1.1, 17 November 2026. Status: Final (Siap Eksekusi).*

## 1. Ringkasan

Aplikasi web progresif (PWA) *mobile-first* untuk mencatat keuangan berbasis sistem kantong (*envelope budgeting*) dengan siklus anggaran harian, mingguan, atau bulanan (mingguan sebagai default), serta melacak utang secara dinamis. Aplikasi ini dirancang 100% dinamis (*user-defined*) tanpa data bawaan yang tertanam kaku, sehingga siap digunakan oleh siapa saja maupun dijadikan studi kasus portofolio *full-stack* dan perancangan database.

**Tujuan:**

1. Mencegah defisit arus kas melalui disiplin alokasi anggaran dalam siklus yang dapat dipilih pengguna.
2. Mencatat seluruh mutasi transaksi dengan input cepat dari ponsel (< 10 detik).
3. Memberikan kebebasan penuh kepada pengguna untuk mengelola kategori, siklus anggaran, dan daftar utang secara dinamis (CRUD penuh).
4. Menjadi proyek portofolio yang mendemonstrasikan perancangan skema relasional, kalkulasi berbasis *SQL Views*, keamanan data tingkat baris (*Row Level Security*), dan pengalaman pengguna (UX) *mobile*.

**Batasan Proyek:**

* Biaya operasional Rp 0 (sepenuhnya memanfaatkan *free tier* permanen).
* Dapat diakses dan di-install di ponsel (Android/iOS) maupun laptop Linux.
* Dikerjakan dan dipelihara oleh satu orang (*solo developer*).

## 2. Prinsip Konfigurasi & Dinamika Data

Aplikasi ini menerapkan pendekatan **Zero Hardcoded Data (Blank-Slate Initialization)**:

* **Akun Baru Kosong (Clean State):** Saat pengguna baru mendaftar dan masuk pertama kali, seluruh daftar kategori, anggaran, transaksi, dan pelacak utang berada dalam keadaan kosong (*empty state* dengan panduan aksi cepat). Siklus anggaran awal adalah mingguan.
* **Siklus Anggaran yang Dapat Dipilih:** Pengguna dapat memilih siklus harian, mingguan, atau bulanan. Perubahan siklus berlaku untuk periode baru; data anggaran lama tetap tersimpan pada siklus asalnya dan tidak dikonversi otomatis.
* **Reset dan Penghapusan Akun:** Reset pabrik menghapus seluruh data finansial dan mengembalikan preferensi ke default tanpa menghapus akun login. Penghapusan akun menghapus akun autentikasi beserta seluruh data terkait setelah verifikasi kata sandi.
* **CRUD Penuh di Seluruh Entitas:** Pengguna memiliki kendali penuh untuk menambah (*Create*), melihat (*Read*), mengubah (*Update*), dan menghapus (*Delete*) pemasukan dan alokasi sesuai siklus, kategori kantong, mutasi transaksi, daftar utang, hingga target pelunasan.
* **Pemisahan Data Demo:** Data simulasi hanya diisi secara terpisah di lingkungan **Proyek Demo** (F6) untuk keperluan pratinjau rekruter/reviewer tanpa memengaruhi alur kerja pengguna nyata.

## 3. Spesifikasi Fitur

| Kode | Fitur | Prioritas | Deskripsi Singkat |
| :--- | :--- | :--- | :--- |
| F1 | Kantong Anggaran Fleksibel | **MVP** | Siklus harian/mingguan/bulanan (default mingguan), CRUD pemasukan dan alokasi per periode, CRUD kategori kantong, perhitungan *unallocated cash*, serta indikator status otomatis (`AMAN`, `HABIS`, `OVERBUDGET`). |
| F2 | Ledger Transaksi | **MVP** | CRUD mutasi (tanggal, kode minggu otomatis ISO/Senin–Minggu, tipe, kategori, nominal, catatan) dengan form *quick-add* ramah jempol di HP. |
| F3 | Pelacak Utang Dinamis | **MVP** | CRUD multi-utang, CRUD target bertahap opsional, penautan transaksi cicilan, penyesuaian pokok (*top-up*/koreksi), dan perhitungan sisa otomatis (detail di 3.1). |
| F4 | Laporan Bulanan | v1.1 | Ringkasan pemasukan vs pengeluaran bulanan serta grafik distribusi pengeluaran per kategori. |
| F5 | Autentikasi, Isolasi Data & Pengelolaan Akun | **MVP** | Login aman per pengguna, isolasi data menggunakan *Row Level Security* (RLS), reset pabrik, dan penghapusan akun terverifikasi. |
| F6 | Mode Demo Portofolio | v1.1 | Akses langsung ke lingkungan demo berisi data simulasi netral tanpa perlu registrasi akun, terisolasi dari akun pengguna nyata. |
| F7 | Ekspor CSV & Backup | v1.1 | Unduh seluruh data transaksi, kantong, dan riwayat utang dalam format CSV untuk arsip dan pencadangan. |
| F8 | Dukungan PWA | **MVP** | Manifest dan *Service Worker* agar aplikasi dapat di-install ke *home screen* HP layaknya aplikasi native. |

### 3.1 Detail F3: Pelacak Utang Dinamis

* **CRUD Multi-Utang:** Pengguna dapat menambah, mengubah, dan menghapus catatan utang kapan saja (nama pemberi pinjaman, nominal pokok, tanggal mulai, catatan).
* **CRUD Target Bertahap Opsional (0..N):** Setiap utang dapat memiliki 0, 1, atau banyak target/milestone (nama target, nominal kumulatif, tenggat waktu). Target dapat ditambah, diedit, atau dihapus kapan saja meskipun cicilan sudah berjalan.
* **Cicilan Berbasis Transaksi:** Pembayaran cicilan dicatat melalui *Ledger Transaksi* (F2) dan ditautkan ke `debt_id` tertentu. Total terbayar dan sisa utang dihitung otomatis dari agregasi transaksi tersebut.
* **Status Utang:** `AKTIF`, `LUNAS` (otomatis berubah saat sisa utang $\le 0$), atau `DIARSIPKAN`. Utang yang `LUNAS` tetap tampil di riwayat dengan lencana status, dan dapat diarsipkan secara manual agar daftar utama tetap ringkas.
* **Penambahan Utang & Top-Up:** Setelah utang lunas, pengguna bebas membuat utang baru atau menambahkan nominal ke utang yang sudah ada (*top-up* tercatat di tabel penyesuaian beserta alasannya) sehingga status otomatis kembali `AKTIF`.
* **Fleksibilitas Kantong Cicilan:** Alokasi kantong cicilan di F1 tidak terikat mati pada satu utang. Setelah utang lunas, alokasi dana per periode dapat diubah atau dihapus, lalu dialihkan ke kantong lain (tabungan, dana darurat, dll.).
* **Koreksi & Penghapusan Transaksi:** Jika terjadi kesalahan input cicilan, pengeditan atau penghapusan transaksi di ledger akan langsung menghitung ulang sisa utang dan progres target secara *real-time*.
* **Saran Cicilan Mingguan (v1.1):** Kalkulasi opsional berupa $\text{Sisa Utang} \div \text{Sisa Minggu Menuju Tenggat}$ sebagai referensi alokasi mingguan.

## 4. Arsitektur & Desain Database

### 4.1 Stack Teknologi (Terkunci)

* **Frontend:** React + TypeScript + Vite, Tailwind CSS, dan `vite-plugin-pwa`.
* **Backend / Database / Auth:** Supabase (PostgreSQL, Supabase Auth, Auto-generated REST API, Row Level Security).
* **Hosting & CI/CD:** Vercel (Hobby Plan) terhubung langsung ke repositori GitHub.
* **Pemisahan Lingkungan:** Menggunakan **dua proyek Supabase terpisah** — Proyek A untuk aplikasi utama (pengguna nyata dengan akun bersih), dan Proyek B khusus untuk *Mode Demo* portofolio dengan data simulasi.

### 4.2 Skema Database Relasional

```sql
-- Master kategori kantong & pengeluaran (user-defined CRUD)
categories (id, user_id, name, type, is_active, created_at)

-- Header anggaran per siklus (period_type: daily/weekly/monthly)
weekly_budgets (id, user_id, week_start, period_type, income, note, created_at)

-- Preferensi siklus anggaran per pengguna (default mingguan)
user_settings (user_id, budget_period_type)

-- Alokasi dana per kategori dalam satu siklus
envelopes (id, user_id, weekly_budget_id, category_id, allocated)

-- Buku besar seluruh transaksi (pengeluaran, pemasukan tambahan, & cicilan utang)
transactions (id, user_id, date, week_code, type, category_id, debt_id, amount, note, created_at)

-- Header daftar utang
debts (id, user_id, creditor, principal, start_date, is_archived, note, created_at)

-- Riwayat penambahan (top-up) atau koreksi pokok utang
debt_adjustments (id, user_id, debt_id, date, delta, reason, created_at)

-- Target pelunasan bertahap (0..n per utang)
debt_targets (id, user_id, debt_id, name, target_amount, deadline)
```

### 4.3 Prinsip *Single Source of Truth* (SQL Views)

Status kantong, sisa alokasi (*unallocated cash*), total terbayar, sisa utang, status `LUNAS`, dan persentase progres target **tidak disimpan sebagai kolom statis**, melainkan dihitung secara dinamis melalui **PostgreSQL Views**:

* $\text{Sisa Kantong} = \text{allocated} - \sum \text{transactions.amount}$
* $\text{Sisa Utang} = \text{principal} + \sum \text{debt\_adjustments.delta} - \sum \text{transactions.amount (cicilan)}$

## 5. Kebutuhan Non-Fungsional

* **Biaya:** Rp 0 menggunakan *free tier* Supabase dan Vercel. Pemantauan kapasitas database dilakukan secara berkala (batas 500 MB/proyek).
* **Keamanan:** Kebijakan *Row Level Security* (RLS) wajib aktif di seluruh tabel dengan aturan ketat `user_id = auth.uid()`. Hanya *Supabase Anon Key* publik yang diekspos di frontend.
* **Ketersediaan (*Availability*):** Proyek utama aktif secara berkala melalui penggunaan harian. Proyek demo dilengkapi penjadwalan *keep-alive* (GitHub Actions cron setiap 3 hari) agar database tetap aktif saat diakses rekruter/reviewer.
* **Pencadangan (*Backup*):** Ekspor data manual ke CSV dilakukan minimal satu kali setiap akhir bulan sebagai mitigasi tidak adanya fitur *automated daily backup* pada paket gratis.
* **Performa & UX:** Antarmuka dioptimalkan untuk layar ponsel (*mobile-first*) dengan *empty state* yang informatif bagi pengguna baru dan input transaksi rutin di bawah 10 detik.

## 6. Rencana Tahapan Eksekusi

| Fase | Periode | Target Luaran (*Deliverables*) |
| :--- | :--- | :--- |
| **0. Jembatan Data** | 17 – 23 Nov 2026 | Google Form + Google Sheets sederhana agar pencatatan minggu pertama (mulai 23 Nov) langsung berjalan tanpa menunggu aplikasi selesai. |
| **1. Fondasi & DB** | Minggu 1 – 2 | Setup repositori React + Vite, inisialisasi 2 proyek Supabase, pembuatan tabel, *SQL Views*, kebijakan RLS, Autentikasi, dan CRUD Kategori. |
| **2. MVP & Migrasi** | Minggu 3 – 4 | Fitur Kantong Mingguan (F1), Ledger Transaksi cepat (F2), Pelacak Utang Dinamis (F3), konfigurasi PWA (F8), dan impor data dari Google Sheets. |
| **3. Pemakaian Nyata** | Desember 2026 | Penggunaan harian secara penuh, perbaikan *bug* UX di ponsel, dan penyempurnaan alur CRUD. |
| **4. Rilis Portofolio** | Januari 2027 | Penambahan Laporan Bulanan (F4), Mode Demo dengan data simulasi netral (F6), Ekspor CSV (F7), penyusunan `README.md`, diagram ERD, dan tangkapan layar. |

## 7. Kriteria Keberhasilan

1. **Integritas & Dinamika Data:** Pengguna baru memulai dari keadaan bersih (*blank slate*) dan dapat melakukan CRUD penuh pada kategori, pemasukan mingguan, kantong, transaksi, serta utang tanpa kendala.
2. **Akurasi Kalkulasi:** Saldo sisa kantong dan sisa utang pada *SQL Views* 100% cocok dengan perhitungan manual setelah operasi tambah, ubah, maupun hapus data.
3. **Kesiapan Portofolio:** Tautan demo di Vercel dapat diakses publik tanpa error dengan data simulasi netral, lengkap dengan dokumentasi arsitektur di GitHub.
4. **Pengalaman Pengguna:** Seluruh alur pencatatan di perangkat mobile berjalan responsif dan memenuhi target waktu input < 10 detik.

## 8. Manajemen Risiko

| Risiko | Dampak | Rencana Mitigasi |
| :--- | :--- | :--- |
| Aplikasi belum siap saat 23 Nov 2026 | Data transaksi minggu pertama hilang | Menggunakan Google Form + Sheets pada Fase 0 lalu diimpor saat MVP siap. |
| Proyek Demo Supabase ter-*pause* | Reviewer portofolio mendapati error saat membuka demo | Menjalankan *cron job* ringan via GitHub Actions setiap 3 hari untuk menjaga koneksi tetap aktif. |
| Kebocoran data pribadi di demo | Privasi keuangan pribadi terekspos | Memisahkan sepenuhnya proyek Supabase utama dan proyek Supabase demo (berisi data simulasi umum). |
| *Scope creep* (fitur melebar) | MVP tertunda akibat tugas kuliah | Mengunci ruang lingkup MVP hanya pada F1, F2, F3, F5, dan F8; menunda F4, F6, dan F7 ke v1.1. |

## 9. Keputusan Desain Terkunci (Log Keputusan)

1. **Frontend:** React + TypeScript + Vite (ekosistem luas, dukungan `vite-plugin-pwa` stabil, dan nilai jual tinggi di portofolio).
2. **Backend & Hosting:** Supabase (PostgreSQL + Auth + RLS) dan Vercel Hobby.
3. **Model Kepemilikan & Inisialisasi Data:** Multi-tenant ready (`user_id` di setiap tabel dengan RLS aktif) dengan status awal kosong (*blank slate*) dan CRUD penuh agar relevan bagi pengguna mana pun.
4. **Perilaku Sisa Dana Mingguan:** Dana tidak terpakai tetap tercatat sebagai surplus minggu berjalan (*unspent balance*), sementara minggu baru dimulai dengan alokasi segar berdasarkan pemasukan minggu tersebut.
5. **Tampilan Utang Lunas:** Tetap ditampilkan dalam daftar dengan status `LUNAS` beserta indikator visual penuh (100%), dengan opsi tombol "Arsipkan" agar pengguna dapat merapikan tampilan kapan saja.
6. **Indikator Tenggat Target:** Ditampilkan melalui indikator warna dan sisa hari/minggu di kartu target pada antarmuka aplikasi (tanpa *push notification* kompleks agar menjaga arsitektur tetap ringan dan gratis).