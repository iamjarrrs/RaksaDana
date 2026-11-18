# RaksaDana

**RaksaDana** adalah aplikasi manajemen keuangan pribadi berbasis web yang dirancang untuk membantu pengguna mengatur anggaran mingguan (*weekly budgeting*) menggunakan sistem kantong (*envelope system*), mencatat transaksi pengeluaran maupun pemasukan, serta memantau pelunasan utang dan target finansial secara terstruktur.

Nama **RaksaDana** terinspirasi dari kata dalam bahasa Sunda/Sanskerta *"Raksa"* (menjaga, memelihara, atau melindungi) dan *"Dana"* (keuangan), yang mencerminkan tujuan utama aplikasi ini: menjaga alokasi dana agar tetap disiplin, terukur, dan terhindar dari pengeluaran impulsif.

**Live Demo:** [https://raksa-dana.vercel.app](https://raksa-dana.vercel.app)

---

## Fitur Utama

* **Sistem Kantong Anggaran (*Envelope Budgeting*):** Membagi alokasi dana ke dalam kantong-kantong kategori khusus (kebutuhan harian, tabungan, pembayaran utang) dengan warna dan ikon kustom.
* **Perencanaan Anggaran Mingguan (*Weekly Budgets*):** Mengontrol batas pengeluaran per minggu secara fleksibel dan memantau sisa anggaran secara *real-time*.
* **Pencatatan Transaksi Terintegrasi:** Mencatat setiap arus kas keluar dan masuk yang langsung terhubung ke masing-masing kantong kategori.
* **Pelacakan Utang & Target Pelunasan (*Debt & Target Tracking*):** Memantau rincian utang, penyesuaian saldo utang, serta progres pencapaian target pelunasan.
* **Isolasi Data Pengguna (*Row Level Security*):** Setiap pengguna memiliki akun tersendiri dengan isolasi data ketat di tingkat database sehingga data finansial antar pengguna tidak dapat saling diakses.

---

## Teknologi yang Digunakan

* **Frontend:** React, TypeScript, Vite
* **Backend & Database:** Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security)
* **Deployment & Hosting:** Vercel (Continuous Deployment via GitHub)

---