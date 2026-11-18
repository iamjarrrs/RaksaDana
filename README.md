# RaksaDana

> **Manajemen Anggaran Fleksibel, Pelacak Multi-Sumber Dana (Cash & E-Money), serta Monitoring Pelunasan Utang Pribadi.**

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**Live Deployment:** [https://raksa-dana.vercel.app](https://raksa-dana.vercel.app)

---

## 📖 Daftar Isi

- [RaksaDana](#raksadana)
  - [📖 Daftar Isi](#-daftar-isi)
  - [💡 Tentang RaksaDana](#-tentang-raksadana)
  - [🎯 Permasalahan yang Dipecahkan](#-permasalahan-yang-dipecahkan)
  - [⚡ Fitur-Fitur Utama](#-fitur-fitur-utama)
    - [1. Sistem Kantong Anggaran (*Envelope Budgeting*)](#1-sistem-kantong-anggaran-envelope-budgeting)
    - [2. Pemisahan Uang Tunai (Cash) \& Multi E-Money](#2-pemisahan-uang-tunai-cash--multi-e-money)
    - [3. Celengan Digital Fleksibel (Uang Sisa)](#3-celengan-digital-fleksibel-uang-sisa)
    - [4. Input Transaksi Cepat (\< 10 Detik) \& Pilihan Sumber Dana](#4-input-transaksi-cepat--10-detik--pilihan-sumber-dana)
    - [5. Pelacak Utang \& Cicilan Dinamis](#5-pelacak-utang--cicilan-dinamis)
    - [6. Statistik Keuangan \& Analisis Arus Kas](#6-statistik-keuangan--analisis-arus-kas)
    - [7. Desain Full Dark Black \& Responsif Lintas Perangkat](#7-desain-full-dark-black--responsif-lintas-perangkat)
    - [8. Privasi \& Keamanan Data Tingkat Database](#8-privasi--keamanan-data-tingkat-database)
  - [🗺️ Alur Penggunaan Aplikasi (User Journey)](#️-alur-penggunaan-aplikasi-user-journey)
  - [🏛️ Arsitektur \& Konsep Database (Single Source of Truth)](#️-arsitektur--konsep-database-single-source-of-truth)
    - [1. Relasi Entitas Database](#1-relasi-entitas-database)
    - [2. Rumus Agregasi PostgreSQL Views](#2-rumus-agregasi-postgresql-views)
  - [🛠️ Teknologi yang Digunakan (Tech Stack)](#️-teknologi-yang-digunakan-tech-stack)
  - [🚀 Panduan Instalasi \& Menjalankan Lokal (Quickstart)](#-panduan-instalasi--menjalankan-lokal-quickstart)
    - [1. Prasyarat](#1-prasyarat)
    - [2. Kloning Repositori](#2-kloning-repositori)
    - [3. Pasang Dependensi](#3-pasang-dependensi)
    - [4. Konfigurasi Environment Variables](#4-konfigurasi-environment-variables)
    - [5. Setup Skema Database di Supabase](#5-setup-skema-database-di-supabase)
    - [6. Jalankan Server Pengembangan](#6-jalankan-server-pengembangan)
    - [7. Build untuk Produksi](#7-build-untuk-produksi)
  - [📁 Struktur Direktori Proyek](#-struktur-direktori-proyek)
  - [📄 Hak Cipta \& Lisensi](#-hak-cipta--lisensi)

---

## 💡 Tentang RaksaDana

Nama **RaksaDana** berakar dari bahasa Sunda dan Sanskerta:
* **"Raksa"**: Menjaga, memelihara, melindungi, atau mengendalikan.
* **"Dana"**: Keuangan, harta, atau perbekalan.

Secara filosofis, **RaksaDana** dirancang sebagai perisai finansial pribadi agar arus kas tidak bocor akibat pengeluaran impulsif, saldo yang terpencar di berbagai dompet digital tanpa pengawasan, atau kewajiban utang yang tertunda pelunasannya.

Aplikasi ini menerapkan pendekatan **Zero Hardcoded Data (*Blank-Slate Philosophy*)**: setiap akun baru tidak memiliki data bawaan palsu (*dummy*), melainkan bersih 100% dan memberikan kebebasan mutlak kepada pengguna untuk merancang kategori kantong, menyetel siklus anggaran, dan mengelola rekening digitalnya sendiri.

---

## 🎯 Permasalahan yang Dipecahkan

Banyak orang mengalami kesulitan mengelola uang karena:
1. **Siklus Bulanan Terlalu Jauh**: Menunggu akhir bulan untuk evaluasi sering kali membuat uang habis di minggu pertama. RaksaDana mengutamakan evaluasi mingguan (dengan opsi harian/bulanan).
2. **Saldo E-Money Tercecer**: Memiliki saldo di GoPay Rp 35.000, DANA Rp 80.000, ShopeePay Rp 25.000, dan Tunai Rp 200.000 sering kali membuat seseorang merasa "tidak punya uang" atau sebaliknya "merasa masih banyak uang", padahal saldo tersisa sedikit di mana-mana. RaksaDana melacak seluruh dompet digital secara terpusat.
3. **Mencatat Terlalu Rumit**: Form pencatatan konvensional membutuhkan input berlapis. RaksaDana menyediakan form catat cepat instan (< 10 detik) dengan tombol *one-tap* sumber dana.
4. **Cicilan Utang Tidak Terukur**: Beban pinjaman tidak terpantau progres pelunasannya. RaksaDana mengintegrasikan pembayaran cicilan langsung dari arus kas transaksi.

---

## ⚡ Fitur-Fitur Utama

### 1. Sistem Kantong Anggaran (*Envelope Budgeting*)
* **Multi-Siklus Anggaran**: Pilih antara siklus **Harian**, **Mingguan (Default)**, atau **Bulanan**.
* **Alokasi Kantong Dinamis**: Bagi pemasukan ke dalam pos-pos pengeluaran (Makan, Bensin, Belanja, Tabungan, Cicilan).
* **Indikator Status Otomatis**:
  * 🟢 **AMAN**: Pengeluaran masih di bawah alokasi dana kantong.
  * 🟡 **HABIS**: Dana kantong tepat habis terpakai (100%).
  * 🔴 **OVERBUDGET**: Pengeluaran melebihi anggaran yang dialokasikan.
* **Unallocated Cash Tracker**: Memastikan setiap rupiah pemasukan memiliki tujuan alokasi yang jelas.

### 2. Pemisahan Uang Tunai (Cash) & Multi E-Money
* **Total Dana Transparan**: Akumulasi total uang yang dimiliki dihitung otomatis dari `Uang Tunai + Semua Akun E-Money`.
* **Dukungan Multi Dompet Digital**: Catat tanpa batas tempat penyimpanan uang digital Anda (misal: GoPay, OVO, DANA, ShopeePay, BCA, Bank Jago, Mandiri, dll).
* **Highlight Sisa Uang Tersedia (Hero Banner)**: Angka sisa uang aktif yang masih aman dibelanjakan ditampilkan dengan tipografi kontras tinggi berukuran besar (`text-3xl` s/d `text-5xl font-mono`).
* **Laporan Dropdown Saldo E-Money**:
  * Menampilkan nominal awal, jumlah terpakai, dan sisa saldo aktif tiap akun.
  * Indikator status: `TERSEDIA`, `HAMPIR HABIS` ($\le 25\%$), atau `HABIS` ($0\%$).
  * Tombol **"Gunakan"**: Sekali klik langsung membuka form transaksi dengan akun e-money tersebut otomatis terpilih, memudahkan Anda menghabiskan saldo receh yang tersisa di dompet digital.

### 3. Celengan Digital Fleksibel (Uang Sisa)
* **Tanpa Beban Target**: Tidak ada patokan jumlah setoran wajib, bebas menabung kapan saja ketika memiliki uang sisa.
* **Pilihan Cepat "Semua Sisa" atau "Sebagian"**: Tombol sekali sentuh untuk memindahkan seluruh sisa uang periode berjalan ke celengan, atau memasukkan sebagian nominal sesuai keinginan.
* **Pilihan Sumber Dana Asal**: Pengguna dapat memilih apakah uang sisa yang ditabung berasal dari uang tunai (*Cash*) atau salah satu akun dompet digital (*E-Money*), otomatis memotong saldo dompet terkait.
* **Akumulasi Saldo & Riwayat Tabungan**: Saldo celengan bertambah secara akumulatif lintas waktu (*lifetime savings*) dilengkapi riwayat mutasi setoran dan penarikan.
* **Penarikan Fleksibel**: Kapan saja dana celengan dibutuhkan, pengguna dapat menarik sebagian atau seluruh saldo celengan kembali ke dompet aktif.

### 4. Input Transaksi Cepat (< 10 Detik) & Pilihan Sumber Dana
* **Tombol Cepat Sumber Dana**: Pilih apakah mutasi dilakukan via uang tunai (`Cash`) atau dompet digital (`GoPay`, `OVO`, `BCA`, dll) dengan satu sentuhan.
* **Pengurangan Saldo Otomatis**: Transaksi via GoPay hanya memotong saldo GoPay, transaksi tunai memotong saldo Cash.
* **Label Sumber Dana di Riwayat**: Setiap baris mutasi di tab Riwayat dilengkapi lencana visual (misal: `💵 Cash`, `📱 GoPay`, `🏦 BCA`).

### 5. Pelacak Utang & Cicilan Dinamis
* **Pencatatan Pinjaman Fleksibel**: Tambahkan pemberi pinjaman, nominal pokok awal, dan tanggal jatuh tempo.
* **Penyesuaian Pokok (Top-Up / Koreksi)**: Tambah utang baru atau lakukan penyesuaian diskon/koreksi dengan catatan alasan.
* **Pelunasan Terintegrasi**: Setiap transaksi bertipe `Cicilan Utang` otomatis mengakumulasi total terbayar dan mengurangi sisa utang secara *real-time*.
* **Status Otomatis**: Berubah menjadi `LUNAS` saat sisa utang $\le 0$, serta fitur arsip utang agar tampilan tetap bersih.

### 6. Statistik Keuangan & Analisis Arus Kas
* **Grafik Batang Komparatif Harian**: Membandingkan pengeluaran harian vs pemasukan harian dalam skala proporsional yang seimbang.
* **Distribusi per Kategori**: Diagram batang persentase untuk melihat pos pengeluaran terbesar.
* **Rata-Rata Pengeluaran Harian**: Mengetahui laju pengeluaran rata-rata per hari untuk evaluasi gaya hidup.

### 7. Desain Full Dark Black & Responsif Lintas Perangkat
* **Palet Warna OLED True Black (`#000000`)**: Latar hitam pekat dipadukan dengan permukaan gelap netral (`#09090b`), border minimalis tanpa warna biru pudar (*zero blue-tint*), dan aksen emerald/indigo yang tajam.
* **Navigasi Ganda Adaptif (Dual Navigation)**:
  * 📱 **Mobile (< 768px)**: *Bottom Navigation Bar* ramah jempol dan Floating Action Button (FAB) catat cepat.
  * 💻 **Tablet & Desktop ($\ge$ 768px)**: Navigasi berpindah secara mulus ke *Top Header Bar* dengan tombol catat cepat terintegrasi, memanfaatkan layar monitor secara maksimal tanpa bottom bar yang mengganggu.
  * 📊 **Layout 2-Kolom & Grid**: Kartu kantong, kartu utang, serta grafik statistik otomatis tertata rapi dalam *responsive grid* 2 atau 3 kolom.

### 8. Privasi & Keamanan Data Tingkat Database
* **Autentikasi Supabase**: Login dan registrasi terenkripsi dengan email dan kata sandi.
* **PostgreSQL Row Level Security (RLS)**: Setiap baris tabel (`categories`, `weekly_budgets`, `transactions`, `debts`) dikunci menggunakan `auth.uid() = user_id`, menjamin data antar pengguna terisolasi 100%.
* **Kendali Data Penuh**:
  * *Reset Anggaran Periode*: Mereset alokasi kantong periode berjalan tanpa menghapus riwayat transaksi.
  * *Kembali ke Setelan Pabrik*: Menghapus seluruh data keuangan akun tanpa menghapus akun login.
  * *Hapus Akun Permanen*: Menghapus akun autentikasi dan seluruh basis datanya selamanya.

---

## 🗺️ Alur Penggunaan Aplikasi (User Journey)

```
       [1. Buat Akun / Masuk]
                 │
                 ▼
     [2. Atur Sumber Dana & Pemasukan]
    ├── Input Uang Tunai (Cash fisik)
    └── Input Saldo E-Money (GoPay, OVO, Rekening Bank, dll)
                 │
                 ▼
       [3. Alokasikan ke Kantong]
    ├── Kantong Makan, Transport, Belanja
    └── Kantong Cicilan Utang / Tabungan
                 │
                 ▼
       [4. Catat Mutasi Harian]
    ├── Buka tombol cepat "Catat Transaksi"
    ├── Pilih Sumber Dana (Cash / GoPay / dll)
    └── Pilih Kantong Anggaran
                 │
                 ▼
    [5. Pantau Sisa Dana & Laporan E-Money]
    ├── Sisa Uang Tersedia terupdate real-time
    ├── Saldo masing-masing e-money berkurang presisi
    └── Gunakan sisa receh e-money hingga tuntas
```

---

## 🏛️ Arsitektur & Konsep Database (Single Source of Truth)

RaksaDana menghindari duplikasi status statis di database. Status kantong, sisa utang, dan arus kas dihitung langsung oleh **PostgreSQL Views** berkeamanan tinggi (`security_invoker = true`):

### 1. Relasi Entitas Database
* `categories`: Kategori kantong pengeluaran, tabungan, atau cicilan milik pengguna.
* `weekly_budgets`: Header periode anggaran (Harian, Mingguan, Bulanan) yang menyimpan total pemasukan dan rincian sumber dana (*cash & e-money*).
* `user_settings`: Preferensi siklus anggaran per pengguna.
* `envelopes`: Alokasi nominal dana untuk kategori tertentu dalam satu siklus anggaran.
* `transactions`: Buku besar seluruh mutasi (pengeluaran, pemasukan tambahan, cicilan utang) lengkap dengan penanda sumber dana.
* `debts`: Header catatan utang / pinjaman.
* `debt_adjustments`: Riwayat penambahan (*top-up*) atau koreksi pokok pinjaman.

### 2. Rumus Agregasi PostgreSQL Views
* **Sisa Saldo Kantong (`v_envelope_status`)**:
  $$\text{Sisa Kantong} = \text{Alokasi Dana} - \sum \text{Transaksi Pengeluaran pada Periode Terkait}$$
* **Sisa Utang (`v_debt_summary`)**:
  $$\text{Sisa Utang} = \text{Pokok Awal} + \sum \text{Penyesuaian Pokok} - \sum \text{Transaksi Cicilan}$$
* **Sisa Dana Belum Teralokasi (`v_weekly_budget_summary`)**:
  $$\text{Unallocated Cash} = \text{Total Pemasukan Periode} - \sum \text{Alokasi Seluruh Kantong}$$

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

| Lapisan | Teknologi | Peran |
| :--- | :--- | :--- |
| **Framework UI** | React 18 + TypeScript | Struktur antarmuka modular berkode aman dan bertipe statis |
| **Build Tool** | Vite 6 | Kompilasi ultra-cepat dengan Hot Module Replacement (HMR) |
| **Styling** | Tailwind CSS 3 | Desain modern utility-first dengan tema Full Dark Black |
| **Database & Auth** | Supabase (PostgreSQL 15) | Relational Database, Row Level Security, Auth terenkripsi |
| **Icon Pack** | Lucide React | Ikonografi modern, konsisten, dan ringan |
| **Manipulasi Waktu** | date-fns 4 (Locale ID) | Format tanggal, kalkulasi siklus kalender & ISO week |
| **PWA Capability** | vite-plugin-pwa | PWA manifest & Service Worker untuk install di HP/Desktop |
| **Deployment** | Vercel | Hosting cloud otomatis tersambung ke repositori GitHub |

---

## 🚀 Panduan Instalasi & Menjalankan Lokal (Quickstart)

### 1. Prasyarat
Pastikan komputer Anda telah terinstal:
* [Node.js](https://nodejs.org/) (versi 18.x atau lebih baru)
* NPM / PNPM / Yarn

### 2. Kloning Repositori
```bash
git clone https://github.com/iamjarrr/RaksaDana.git
cd RaksaDana
```

### 3. Pasang Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment Variables
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka berkas `.env` lalu masukkan kredensial proyek Supabase Anda:
```env
VITE_SUPABASE_URL=https://proyek-anda.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Setup Skema Database di Supabase
1. Buka dashboard proyek Supabase Anda di browser.
2. Masuk ke menu **SQL Editor**.
3. Jalankan skrip SQL yang ada pada berkas [supabase/schema.sql](file:///home/iamjarrr/Projects/RaksaDana/supabase/schema.sql) untuk menginisialisasi seluruh tabel, indeks, view, dan aturan RLS.
4. Jalankan berkas migrasi di [supabase/migrations/](file:///home/iamjarrr/Projects/RaksaDana/supabase/migrations/) untuk memastikan seluruh fungsi pendukung siklus kustom aktif.

### 6. Jalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan aktif di alamat lokal Anda (biasanya `http://localhost:5173`).

### 7. Build untuk Produksi
```bash
npm run build
```
Hasil build siap *deploy* akan tersimpan di direktori `dist/`.

---

## 📁 Struktur Direktori Proyek

```
RaksaDana/
├── public/                 # Favicon, manifest web, aset publik
├── src/
│   ├── components/         # Komponen UI utama
│   │   ├── AuthScreen.tsx       # Layar login & registrasi akun
│   │   ├── KantongTab.tsx       # Tab kantong anggaran, saldo cash & e-money
│   │   ├── LedgerTab.tsx        # Tab riwayat mutasi transaksi
│   │   ├── QuickAddModal.tsx    # Modal catat cepat mutasi (< 10 detik)
│   │   ├── StatistikTab.tsx     # Tab grafik batang arus kas & distribusi
│   │   └── UtangTab.tsx         # Tab manajemen utang & cicilan
│   ├── contexts/           # AuthContext untuk sesi Supabase Auth
│   ├── lib/                # Inisialisasi klien Supabase
│   ├── services/           # DataService (CRUD, kalkulasi, parsing note)
│   ├── types/              # Deklarasi tipe TypeScript skema data
│   ├── App.tsx             # Komponen root & navigasi responsif
│   ├── index.css           # Konfigurasi Tailwind & scrollbar kustom
│   └── main.tsx            # Entry point aplikasi
├── supabase/               # Skrip SQL skema tabel, view, dan migrasi
│   ├── migrations/         # Berkas migrasi database
│   └── schema.sql          # Skema database lengkap
├── index.html              # Template HTML utama
├── tailwind.config.js      # Konfigurasi tema warna Full Dark Black
├── vite.config.ts          # Konfigurasi Vite & PWA Plugin
└── README.md               # Dokumentasi lengkap proyek
```

---

## 📄 Hak Cipta & Lisensi

Dibuat dengan dedikasi untuk kebebasan dan kestabilan finansial pribadi.

Copyright &copy; 2026 **J4RZZZ**. Seluruh hak cipta dilindungi undang-undang (*All rights reserved*).
