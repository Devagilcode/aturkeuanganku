# Menyiapkan akun dan penyimpanan cloud

Aplikasi tetap dapat dipublikasikan di GitHub Pages. Supabase menangani akun dan
database; setiap transaksi dilindungi kebijakan Row Level Security (RLS).

## 1. Buat proyek Supabase

1. Buat proyek di [supabase.com](https://supabase.com/).
2. Buka **SQL Editor**, lalu jalankan isi [`supabase/schema.sql`](./supabase/schema.sql).
   Jalankan ulang skrip ini setelah pembaruan aplikasi agar tabel `budgets` dan
   `savings_goals`, serta izin RLS untuk mengedit transaksi, ikut dibuat.
   Skrip dapat dijalankan berulang kali dengan aman.
3. Project URL dan publishable key sudah diisi di konfigurasi lokal dan workflow.
   Jangan gunakan atau publikasikan `service_role` key.

Untuk pengembangan lokal, salin `.env.example` menjadi `.env.local`, lalu isi
`NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 2. Aktifkan login

- Di **Authentication → Providers**, aktifkan **Email** dan **Google**.
- Ikuti petunjuk provider Google di Supabase untuk mengisi Google OAuth Client ID
  dan Client Secret. Pada Google Cloud, tambahkan URL callback Supabase yang
  ditampilkan di halaman provider sebagai *Authorized redirect URI*.
- Di **Authentication → URL Configuration**, set **Site URL** ke
  `https://devagilcode.github.io/aturkeuanganku/` dan tambahkan URL itu ke
  **Redirect URLs**.
- Jika memakai verifikasi email, sesuaikan template email Supabase bila perlu.
  Akun baru harus mengonfirmasi alamatnya sebelum dapat masuk.

## 3. Deploy ke GitHub Pages

Workflow GitHub Pages sudah memakai URL dan publishable key proyek ini saat
build, jadi tidak perlu menambahkan GitHub Actions secrets. Keduanya adalah
konfigurasi publik yang dikirim ke browser; keamanan data bergantung pada RLS,
bukan pada penyembunyian publishable key. Setelah perubahan di-push ke branch
`main`, workflow akan membangun ulang situs.

## Data lama

Transaksi yang sebelumnya tersimpan di localStorage tetap berada di browser dan
tidak dikirim otomatis ke akun pertama yang login. Setelah masuk, gunakan
fitur **Unduh cadangan** pada pratinjau cetak di versi lama aplikasi, lalu impor
file JSON itu lewat tombol **Impor data** di versi baru. Impor hanya menambahkan
transaksi yang belum ada di akun yang sedang login.
