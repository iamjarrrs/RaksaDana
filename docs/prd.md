# PRD (As-Built & Final): RaksaDana — Sistem Keuangan Fleksibel, Multi-Sumber Dana & Pelacak Utang

*Versi: 2.0 (As-Built / Sesuai Hasil Implementasi Proyek)*  
*Status: Selesai Diimplementasikan & Beroperasi Penuh (Production-Ready)*  
*Aplikasi Live:* [https://raksa-dana.vercel.app](https://raksa-dana.vercel.app)

---

## 1. Ringkasan Eksekutif

**RaksaDana** adalah aplikasi web progresif (PWA) *cross-platform* (mobile, tablet, desktop) yang mengintegrasikan sistem anggaran kantong (*envelope budgeting*), pemisahan sumber dana tunai (*Cash*) dan multi-dompet digital (*E-Money*), pencatatan transaksi instan (< 10 detik), serta pelacakan utang dan cicilan dinamis.

Aplikasi ini dirancang dengan prinsip **Zero Hardcoded Data (*Blank-Slate Philosophy*)** dan arsitektur database **Single Source of Truth** berbasis *PostgreSQL Views* dan *Row Level Security* (RLS) di Supabase.

### Tujuan Utama yang Telah Dicapai:
1. **Mencegah Kebocoran Finansial**: Alokasi anggaran berbasis siklus fleksibel (Harian, Mingguan, Bulanan) dengan status kantong otomatis (`AMAN`, `HABIS`, `OVERBUDGET`).
2. **Monitoring Terpusat Saldo Tunai & E-Money**: Menyelesaikan masalah saldo receh yang terpencar di berbagai e-wallet (GoPay, OVO, DANA, ShopeePay, BCA, dll) melalui perhitungan sisa otomatis dan menu laporan dropdown khusus.
3. **Pencatatan Transaksi Instan (< 10 Detik)**: Modal input cepat (*quick-add*) yang mendukung pemilihan sumber dana sekali sentuh, otomatis memotong saldo rekening/dompet terkait.
4. **Pelacakan Utang & Cicilan Dinamis**: Monitoring sisa pinjaman yang berkurang otomatis setiap kali ada transaksi pembayaran cicilan.
5. **Tampilan Full Dark Black & Responsivitas Maksimal**: Tema OLED true black (`#000000`) dengan navigasi ganda adaptif (bottom bar di HP, top header bar di desktop/tablet).

---

## 2. Prinsip Desain & Dinamika Data (Aktual)

* **Blank-Slate Initialization**: Pengguna baru yang mendaftar memulai dari kondisi akun bersih tanpa data palsu (*dummy*). Disediakan tombol inisialisasi kategori awal (*starter categories*) di tab Setelan sebagai bantuan opsional.
* **Siklus Anggaran Dinamis**: Pengguna dapat memilih siklus **Harian**, **Mingguan (Default)**, atau **Bulanan**. Data periode lama tetap tersimpan pada siklus asalnya tanpa konversi paksa.
* **Multi-Sumber Dana Terintegrasi**: Pemasukan dihitung dari penjumlahan `Uang Tunai (Cash) + Akun-Akun E-Money`. Struktur rincian disimpan secara fleksibel dan tersinkronisasi di Supabase.
* **Isolasi Data Tingkat Baris (RLS)**: Setiap operasi CRUD diverifikasi ketat oleh PostgreSQL RLS menggunakan `auth.uid() = user_id`.
* **Hak Kendali Data Penuh**: Pengguna dapat melakukan reset anggaran periode terpilih, reset pabrik seluruh data keuangan, atau menghapus akun autentikasi permanen.

---

## 3. Matriks Fitur & Status Implementasi Aktual

| Kode | Fitur | Status Aktual | Deskripsi Hasil Implementasi |
| :--- | :--- | :---: | :--- |
| **F1** | **Sistem Kantong Anggaran** | ✅ **Rilis** | Siklus Harian/Mingguan/Bulanan, CRUD pemasukan periode, CRUD alokasi kantong, kalkulasi *unallocated cash*, badge status (`AMAN`, `HABIS`, `OVERBUDGET`), dan grid responsif 1–3 kolom. |
| **F2** | **Multi-Sumber Dana (Cash & E-Money)** | ✅ **Rilis** | Input uang tunai dan multi e-wallet dinamis (GoPay, OVO, DANA, BCA, dll). Hero Banner *Sisa Uang Tersedia* berukuran besar, kartu sisa saldo tunai & e-money, serta menu dropdown laporan sisa saldo per akun e-money lengkap dengan tombol "Gunakan". |
| **F3** | **Ledger & Form Catat Cepat** | ✅ **Rilis** | Form *Quick-Add* (< 10 detik) dengan pemilihan tipe (Pengeluaran, Pemasukan, Cicilan), pemilihan sumber dana instan, penandaan format `[Sumber] Catatan`, serta badge sumber dana di riwayat transaksi. |
| **F4** | **Pelacak Utang & Pinjaman** | ✅ **Rilis** | CRUD daftar utang, penyesuaian pokok (*top-up*/koreksi delta), penautan cicilan otomatis memotong sisa pokok, status `LUNAS` otomatis saat sisa $\le 0$, dan fitur arsip utang. |
| **F5** | **Statistik & Analisis Arus Kas** | ✅ **Rilis** | Grafik batang komparatif pemasukan vs pengeluaran harian dengan skala proporsional, diagram distribusi per kategori, filter periode, dan tata letak 2 kolom di layar lebar. |
| **F6** | **Autentikasi & Pengaturan Akun** | ✅ **Rilis** | Registrasi & Login email Supabase Auth, kartu profil pengguna dengan badge status aktif, kartu pemilihan siklus anggaran visual, reset anggaran periode, reset pabrik, dan hapus akun permanen. |
| **F7** | **Desain Full Dark Black & Responsif** | ✅ **Rilis** | Palet OLED true black (`#000000`, `#09090b`), navigasi ganda adaptif (bottom nav di mobile, top nav di desktop), responsive grid lintas perangkat (HP, tablet, laptop/PC). |
| **F8** | **Dukungan PWA (Progressive Web App)** | ✅ **Rilis** | Service Worker dan web manifest aktif melalui `vite-plugin-pwa` untuk instalasi *native-like* di Android, iOS, dan Desktop. |
| **F9** | **Celengan Digital (Uang Sisa)** | ✅ **Rilis** | Fitur celengan fleksibel tanpa batas target; pengguna bebas memasukkan seluruh atau sebagian sisa uang, memotong saldo sumber dana terkait, mencatat riwayat akumulasi, dan menarik kembali dana sewaktu-waktu. |

---

## 4. Arsitektur Teknis & Database

### 4.1 Stack Teknologi Terpasang
* **Frontend**: React 18.3, TypeScript 5.7, Vite 6.2.
* **Styling & UI**: Tailwind CSS 3.4 (Full Dark Black / OLED Palette), Lucide React (Ikon modern).
* **Manajemen Tanggal**: date-fns 4.1 (dengan lokal bahasa Indonesia `id`).
* **Backend & Database**: Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security).
* **PWA**: `vite-plugin-pwa` 0.21.
* **Hosting**: Vercel (Continuous Deployment dari repositori GitHub).

### 4.2 Skema Tabel Relasional Aktual
```sql
-- 1. Kategori Kantong & Pos Pengeluaran
categories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'DEBT_PAYMENT', 'SAVINGS')),
    color TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
)

-- 2. Header Anggaran per Siklus (Menyimpan Total Pemasukan & Rincian Sumber Dana)
weekly_budgets (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    week_start DATE NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    income NUMERIC(14, 2) NOT NULL DEFAULT 0,
    note TEXT, -- Menyimpan JSON breakdown: {"version":1, "cash":number, "emoney":[{"id","name","amount"}]}
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT weekly_budgets_user_period_unique UNIQUE (user_id, period_type, week_start)
)

-- 3. Preferensi Siklus Anggaran per Pengguna
user_settings (
    user_id UUID PRIMARY KEY,
    budget_period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (budget_period_type IN ('daily', 'weekly', 'monthly'))
)

-- 4. Alokasi Kantong Anggaran dalam Satu Siklus
envelopes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    weekly_budget_id UUID NOT NULL REFERENCES weekly_budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    allocated NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT envelopes_budget_category_unique UNIQUE (weekly_budget_id, category_id)
)

-- 5. Buku Besar Transaksi (Ledger)
transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    week_code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'DEBT_PAYMENT')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    debt_id UUID REFERENCES debts(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL,
    note TEXT, -- Format: "[SumberDana] Catatan"
    created_at TIMESTAMPTZ DEFAULT now()
)

-- 6. Header Pinjaman / Utang
debts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    creditor TEXT NOT NULL,
    principal NUMERIC(14, 2) NOT NULL,
    start_date DATE NOT NULL,
    is_archived BOOLEAN DEFAULT false,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
)

-- 7. Penyesuaian Pokok Utang (Top-Up / Koreksi)
debt_adjustments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    delta NUMERIC(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
)
```

### 4.3 Logika Perhitungan Dinamis (*Single Source of Truth*)
1. **Status & Sisa Kantong (`v_envelope_status`)**:
   $$\text{spent} = \sum_{\text{transaksi}} \text{amount}$$
   $$\text{remaining} = \text{allocated} - \text{spent}$$
   $$\text{status} = \begin{cases} \text{OVERBUDGET}, & \text{jika } \text{spent} > \text{allocated} \\ \text{HABIS}, & \text{jika } \text{spent} = \text{allocated} \land \text{allocated} > 0 \\ \text{AMAN}, & \text{lainnya} \end{cases}$$

2. **Ringkasan Anggaran (`v_weekly_budget_summary`)**:
   $$\text{unallocated\_cash} = \text{income} - \sum \text{allocated}$$
   $$\text{net\_balance} = \text{income} - \sum \text{spent}$$

3. **Pelunasan Utang (`v_debt_summary`)**:
   $$\text{effective\_principal} = \text{principal} + \sum \text{delta}$$
   $$\text{remaining\_debt} = \text{effective\_principal} - \sum \text{cicilan}$$
   $$\text{status} = \begin{cases} \text{LUNAS}, & \text{jika } \text{remaining\_debt} \le 0 \\ \text{AKTIF}, & \text{lainnya} \end{cases}$$

4. **Sisa Saldo Kas & E-Money (Aplikasi Runtime)**:
   - $\text{Sisa Cash} = \text{Cash Awal} - \sum \text{Transaksi Tunai}$
   - $\text{Sisa Akun E-Money}_i = \text{Saldo Awal}_i - \sum \text{Transaksi via Akun}_i$
   - $\text{Total Sisa Uang Tersedia} = \text{Sisa Cash} + \sum \text{Sisa Semua E-Money}$

---

## 5. Kebutuhan Non-Fungsional (Tercapai)

* **Biaya Operasional**: **Rp 0** (Memanfaatkan paket gratis permanen Supabase dan Vercel).
* **Performa Input**: Form *Quick Add* dapat diakses dan disimpan dalam waktu rata-rata $\le 8$ detik dari perangkat mobile.
* **Keamanan Data**: Seluruh tabel dilindungi *Row Level Security* (RLS). Pengguna hanya dapat membaca dan menulis datanya sendiri.
* **Pengalaman Lintas Perangkat**: Nyaman digunakan pada layar smartphone (360px–430px), tablet (768px–1024px), maupun monitor desktop/laptop (> 1200px).
* **PWA Offline Shell**: Shell aplikasi dapat dibuka langsung dari *home screen* ponsel layaknya aplikasi native.

---

## 6. Riwayat Perubahan Desain (Design Decision Log)

1. **Migrasi Tema ke Full Dark Black (OLED)**: Mengganti warna *slate* (yang memiliki bias warna kebiruan) menjadi *True Pitch Black* (`#000000`) dan *Neutral Charcoal* (`#09090b`) untuk kenyamanan mata di malam hari dan efisiensi baterai layar OLED.
2. **Navigasi Adaptif Ganda**: Menghilangkan *bottom navigation bar* pada layar desktop dan memindahkannya ke *top header bar*, sehingga ruang vertikal layar laptop/PC tidak terbuang sia-sia.
3. **Pemisahan Sumber Dana Tunai & Multi E-Money**: Menambahkan kalkulator sumber dana di modal pemasukan dan pelacakan transaksi spesifik sumber dana menggunakan format tag `[Sumber] Catatan` tanpa perlu mengubah skema tabel Supabase yang berisiko *breaking change*.
4. **Hero Banner Sisa Uang**: Mengubah hierarki visual kartu anggaran utama agar angka sisa uang aktif yang siap dibelanjakan menjadi sorotan utama pengguna.
5. **Pembaruan Halaman Setelan**: Mengganti dropdown kaku dengan kartu pilihan siklus anggaran visual interaktif, merapikan profil pengguna, dan memisahkan zona bahaya dengan konfirmasi *inline* yang aman.
