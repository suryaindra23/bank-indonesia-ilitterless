# COBI

Aplikasi warga, panel petugas iLitterless, dan laporan Bank Indonesia. Frontend Vite dengan backend Express, database SQLite, foto privat, dan autentikasi email melalui SMTP. Desain mengikuti iLitterless Indonesia dan prototipe Bibu yang disediakan.

## Menjalankan

Node.js 22.13+ diperlukan (runtime saat implementasi: Node 25).

```sh
npm install
npm run dev
```

Aplikasi warga: http://127.0.0.1:5173/warga/ . Dashboard petugas: http://127.0.0.1:5173/petugas/ . Dashboard Bank Indonesia: http://127.0.0.1:5173/bank-indonesia/ . Backend: port 3001. Satu perintah `dev` menjalankan frontend dan backend. Halaman utama mengarahkan akun yang sudah masuk ke alamat sesuai perannya.

Konfigurasi SMTP aktual berada di `.env`, diabaikan Git. Gunakan `.env.example` sebagai acuan untuk lingkungan lain. Variabel `MAIL_*` hanya dibaca server, bukan frontend. Port 587 menggunakan STARTTLS; port 465 menggunakan TLS langsung. Nama pengirim mengikuti `MAIL_FROM_NAME` yang diberikan pemilik.

## Akun dan akses

Warga mendaftar dengan nama, kelurahan, email, dan kata sandi minimal 10 karakter. Server mengirim tautan verifikasi sekali pakai, berlaku 15 menit. Buka tautan untuk mengaktifkan akun. Login berikutnya menggunakan email dan kata sandi. Pemulihan kata sandi tersedia lewat email; mengganti kata sandi mencabut seluruh sesi lama.

Tidak ada akun petugas/BI atau kata sandi bawaan. Buat akun internal dari terminal server:

```sh
npm run user:create -- --email petugas@organisasi.id --role admin
npm run user:create -- --email laporan@organisasi.id --role bi
```

Perintah meminta nama dan kata sandi; input kata sandi disembunyikan. Untuk provisioning noninteraktif, password dapat diberikan melalui environment `ACCOUNT_PASSWORD`, bukan argumen command line. Akun internal dibuat oleh operator server dan tidak memerlukan verifikasi email warga. Pendaftaran publik selalu menghasilkan peran warga, sekalipun klien mencoba mengirim peran lain.

Data pribadi warga hanya diterima pemilik dan petugas. Foto aksi yang disetujui petugas ditampilkan pada kegiatan terbaru; foto pending/ditolak dan artikel tetap dilindungi. Petugas dapat meninjau aksi, membuat profil warga tanpa login, membantu pencatatan, mencatat setoran BSIL, mengatur stok hadiah, dan memproses kupon. BI mendapat data tanpa nama/email dan tanpa foto, serta hanya dapat membaca laporan. Mengganti URL/hash tidak mengubah hak akses.

Dashboard petugas dan BI memiliki halaman login terpisah, dengan label peran dan navigasi Warga/Petugas/Bank Indonesia. Akun dengan peran berbeda mendapat pesan akses terbatas beserta tautan ke halaman yang sesuai, bukan akses ke dashboard tujuan. Dashboard BI menampilkan enam indikator, filter kelurahan/minggu, grafik, tabel kelurahan, salin ringkasan, dan ekspor CSV. Dashboard petugas menyediakan verifikasi aksi, kurasi artikel, Kelola belajar, bantuan pencatatan, setoran, database warga, serta hadiah/kupon. Angka selalu menggunakan database server, bukan angka contoh dari tangkapan layar.

## Data dan aturan

- Akun, hash kata sandi scrypt, sesi, token email, audit, dan seluruh data aplikasi disimpan di PostgreSQL Supabase saat `DATABASE_URL` terisi. SQLite `data/bibubebo.sqlite` tetap tersedia khusus pengembangan lokal tanpa konfigurasi Supabase.
- Foto JPEG/PNG/WebP disimpan di bucket Supabase privat (lokal: `data/photos/`), hanya tersedia lewat endpoint yang memeriksa sesi dan pemilik. Unggahan dikecilkan di browser hingga sisi terpanjang 1200 px. Batas file asli 10 MB, batas foto tersimpan 6 MB.
- Database baru dimulai kosong. Data contoh prototipe tidak diimpor otomatis. Tanggal awal pilot disimpan saat database pertama dibuat; `PILOT_START=YYYY-MM-DD` dapat diatur sebelum program dimulai. Hari dan minggu mengikuti Asia/Jakarta.
- Poin aksi harian dihitung server: tolak plastik 1, tas kain 2, tumbler 3, pilah sampah 5, rawat tanaman 5, jalan kaki/bersepeda 10. Poin hanya sekali per jenis aksi per tanggal setelah disetujui. Tantangan aksi diganti kuis mingguan: 10 soal, 1 poin per jawaban benar, maksimal 10 poin per minggu. Setoran tetap 30 dan modul belajar 20. Bonus tantangan yang telah diperoleh dibekukan saat pembaruan agar tidak berkurang; aktivitas berikutnya tidak menambah bonus tantangan lama. Artikel kegiatan mendapat 50 poin setelah lolos kurasi. Poin yang telah diperoleh sebelum perubahan aturan dipertahankan melalui migrasi satu kali, termasuk bonus tantangan lama, agar saldo penukaran tidak berubah surut.
- Penyelesaian modul memberi poin sekali per materi; kuis mingguan memiliki riwayat jawaban terpisah. Pemeriksaan aksi hanya berlaku sekali. Penukaran hadiah memeriksa saldo dan stok dalam transaksi PostgreSQL dengan kunci baris state. Kupon hanya dapat diserahkan satu kali.
- Stok hadiah awal **0**. Petugas mengisi stok untuk hadiah yang benar-benar tersedia melalui tab **Hadiah & kupon**.
- Kabar hasil pemeriksaan tersedia di aplikasi; notifikasi WhatsApp tidak dikirim. SMTP digunakan untuk verifikasi dan pemulihan akun.
- Antrean foto saat koneksi putus disimpan lokal per akun. Permintaan menyertakan kunci idempotensi sehingga retry tidak menggandakan aksi. Buka aplikasi lagi saat koneksi tersedia untuk sinkronisasi. Belum ada service worker/PWA untuk memuat aplikasi pertama kali tanpa internet.
- Perangkat berbeda menggunakan data server yang sama. Browser tidak menjadi sumber saldo, identitas login, atau hak akses.

PostgreSQL menyimpan tabel akun/sesi/token/role/audit dalam schema privat `bibu`. Data domain pilot tetap satu dokumen JSON di tabel state; transaksi mengambil `FOR UPDATE` sehingga beberapa instance API tidak kehilangan pembaruan atau menggandakan penukaran. Seluruh perubahan domain masih memakai satu kunci baris; untuk skala lebih besar, normalisasi tabel domain agar transaksi antarwarga tidak saling menunggu. SQLite lokal memakai antrean transaksi asinkron.

## Build dan hosting

```sh
npm run build
npm start
```

Express melayani `dist/` dan API pada origin yang sama. Untuk akses publik, atur `APP_ORIGIN` ke domain HTTPS, `NODE_ENV=production`, `HOST`/`PORT` sesuai hosting, dan direktori `DATA_DIR` pada volume persisten. Gunakan reverse proxy HTTPS. Cookie sesi produksi memakai `Secure`; origin harus sama dengan alamat yang digunakan warga. Tautan email menggunakan `APP_ORIGIN`, jadi alamat localhost hanya dapat digunakan pada komputer ini. Deployment publik belum dilakukan.

## API

Semua endpoint menggunakan JSON; autentikasi memakai cookie HttpOnly, SameSite=Lax, berlaku tujuh hari. Permintaan mutasi memeriksa Origin. Endpoint autentikasi memiliki pembatasan percobaan.

| Endpoint | Akses / fungsi |
| --- | --- |
| `GET /api/health` | Status server |
| `GET /api/auth/me` | Sesi aktif |
| `POST /api/auth/register` | Daftar warga, kirim verifikasi |
| `POST /api/auth/verify` | Aktivasi lewat token email |
| `POST /api/auth/resend` | Kirim ulang verifikasi |
| `POST /api/auth/login` | Login email dan kata sandi |
| `POST /api/auth/logout` | Cabut sesi aktif |
| `POST /api/auth/forgot` | Kirim pemulihan kata sandi |
| `POST /api/auth/reset` | Ubah kata sandi dengan token |
| `GET /api/bootstrap` | Data aplikasi sesuai hak akses |
| `GET /api/communities` | Total poin dan peringkat komunitas, tanpa identitas anggota |
| `POST /api/preferences` | Preferensi ukuran teks warga |
| `POST /api/actions` | Warga kirim bukti / petugas bantu catat |
| `GET /api/photos/:name` | Foto privat, pemilik atau petugas |
| `POST /api/actions/:id/review` | Petugas menyetujui/menolak |
| `POST /api/residents` | Petugas membuat profil tanpa akun |
| `POST /api/lessons/:id/answer` | Evaluasi kuis, poin sekali |
| `POST /api/lessons/:id/complete` | Tandai materi baru tanpa kuis selesai, poin sekali |
| `POST /api/materials/file` | Unggah MP4/PPT/PPTX/PDF/DOC/DOCX, khusus petugas |
| `POST /api/materials` | Terbitkan materi baru, khusus petugas |
| `GET /api/material-files/:id` | Akses berkas materi dengan autentikasi |
| `POST /api/articles` | Ajukan cerita kegiatan dan teruskan email ke tim |
| `POST /api/articles/:id/send` | Kirim ulang email pengajuan tersimpan |
| `POST /api/articles/:id/review` | Kurasi artikel oleh petugas, 50 poin jika disetujui |
| `POST /api/transactions` | Petugas mencatat setoran |
| `POST /api/rewards/:id/stock` | Petugas mengatur stok |
| `POST /api/rewards/:id/redeem` | Warga menukar poin |
| `POST /api/vouchers/fulfill` | Petugas menyerahkan hadiah |
| `GET /api/reports/export` | Laporan CSV agregat, petugas/BI |

## Pengujian

```sh
npm test
npm run test:postgres
npx playwright install chromium
npm run test:e2e
npm run build
```

Tes backend menggunakan database sementara. Tes browser menggunakan `data/e2e/`, API port 3002, dan frontend port 5175, terpisah dari data aplikasi. Email tes memakai transport JSON pada `NODE_ENV=test`; tidak mengirim pesan ke alamat uji maupun tim iLitterless. Verifikasi koneksi SMTP aktual dilakukan tanpa mengirim email tes. Pengiriman nyata terjadi saat warga mendaftar, meminta pemulihan, atau mengajukan artikel.

Tata letak otomatis menyesuaikan: mobile di bawah 900 px dengan navigasi bawah; website mulai 900 px dengan navigasi atas dan konten beberapa kolom. Palet terang memakai referensi COBI terbaru dari pengguna: navy, biru, hijau, dan putih. Lihat `DESIGN.md` untuk acuan visual dan `bibubebo-prototipe.html` untuk referensi awal.

## Komunitas

Menu **Komunitas** menampilkan komunitas dari pilihan asal pada profil lengkap. Kelompok kelurahan lama (Tlogomas, Dinoyo, Mojolangu) tetap menjadi kelompok fallback untuk profil tanpa asal komunitas. Nama komunitas dikelompokkan tanpa membedakan huruf besar/kecil. Total komunitas merupakan jumlah seluruh poin yang pernah diperoleh anggota, termasuk profil yang dibantu petugas: aksi disetujui, materi belajar selesai, setoran, dan bonus tantangan lama dan hasil kuis mingguan. Aksi pending/ditolak belum memberi poin. Menukar hadiah hanya mengurangi saldo pribadi, tidak mengurangi pencapaian komunitas.

Peringkat dihitung server berdasarkan total poin; nilai sama mendapat peringkat sama (contoh: 1, 1, 3). Komunitas nol poin belum berperingkat. Layar menampilkan total, jumlah anggota, aksi disetujui, serta kontribusi pribadi dan persentasenya. Nama/email anggota lain tidak dikirim lewat API komunitas. Tidak ada input poin manual atau bonus terpisah untuk komunitas. Data dihitung ulang pada bootstrap/API; aplikasi memperbaruinya ketika dibuka ulang, mendapat fokus, atau melalui refresh berkala yang sudah ada.

## Artikel kegiatan dan kurasi

Dari Beranda, pilih **Kirim artikel kegiatan**. Isian wajib: foto kegiatan, tulisan (50–12000 karakter), pihak yang terlibat, dan tanggal kejadian (tidak di masa depan). Server menyimpan pengajuan dan mengirim email berisi empat bagian tersebut beserta lampiran foto ke `CURATION_EMAIL`. Default `ilitterless@gmail.com` diverifikasi dari tautan Email pada https://ilitterlessindonesia.org/contact pada 25 November 2026. Pengirim SMTP tetap mengikuti `.env`; Reply-To menggunakan email warga yang terverifikasi.

Petugas membuka tab **Kurasi artikel**. Artikel baru berstatus menunggu dan belum mendapat poin. Persetujuan memberikan 50 poin sekali; penolakan memerlukan alasan. Jika email gagal, data tetap tersimpan dan tersedia tombol kirim ulang. Persetujuan diblokir sampai email berstatus terkirim. Kurasi dilakukan di aplikasi; balasan email tidak otomatis mengubah keputusan. Foto/tulisan hanya tersedia untuk pengirim dan petugas, bukan warga lain atau akun BI.

## Materi belajar dari tim

Petugas membuka **Kelola belajar**, memilih jenis, mengisi judul dan isi/ringkasan, lalu menerbitkan:

- Video: tautan HTTPS YouTube/Vimeo atau unggahan MP4.
- PowerPoint: PPT/PPTX, dibuka atau diunduh untuk aplikasi presentasi pengguna.
- Modul: PDF, DOC, atau DOCX. PDF dibuka oleh browser; Word diunduh.
- Teks manual: ditulis langsung sebagai teks biasa, tanpa eksekusi HTML.

Batas berkas 50 MB sesuai paket Supabase saat ini. Berkas disimpan di bucket privat (lokal: `data/materials/`). Warga hanya dapat mengakses berkas yang sudah dihubungkan ke materi terbit. Materi langsung muncul di menu Belajar. Menu Belajar hanya menampilkan modul pembelajaran; pertanyaan kuis dipindahkan ke menu Kuis mingguan. Modul dapat ditandai sudah dipelajari, memberi 20 poin sekali per warga. Penandaan ini adalah pengakuan penyelesaian oleh warga, bukan bukti video ditonton sampai akhir atau presentasi selesai dibaca. Berkas Office tidak dikonversi menjadi preview slide.

## Akun dengan beberapa role

Pendaftaran publik selalu membuat akun Warga. Operator membuat akun Petugas (`admin`) atau Bank Indonesia (`bi`) dengan email masing-masing:

```sh
npm run user:create -- --email petugas@example.org --role admin
npm run user:create -- --email laporan@example.org --role bi
```

CLI meminta password melalui terminal. Untuk akun yang sudah ada, tambahkan akses tanpa mengganti password:

```sh
npm run role:grant -- --email EMAIL --roles peserta,admin,bi
```

Pilihan pindah akses hanya ditampilkan pada halaman Super Admin. Halaman `/warga/`, `/petugas/`, dan `/bank-indonesia/` memakai sesi yang sama; server memvalidasi role yang dipilih. Akun BI saja hanya membaca laporan agregat. Akun dengan ketiga role dapat berpindah ke Petugas untuk operasional.

## Supabase dan Vercel

Konfigurasi backend: `DATABASE_URL` (transaction pooler port 6543), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`. Simpan di `.env` lokal dan Environment Variables Vercel. Jangan beri prefiks `VITE_` atau `NEXT_PUBLIC_` pada secret backend. Login tetap memakai akun aplikasi dan hash scrypt yang sudah ada; tidak dipindahkan ke Supabase Auth.

Migrasi dari instalasi SQLite:

1. Hentikan backend lama agar sumber tidak berubah.
2. Isi `.env` sesuai `.env.example`. Jalankan `npm run db:migrate`.
3. Perintah membuat backup konsisten di `data/backups/` (izin 600), memindahkan tabel, mempertahankan ID/password/sesi/role/poin, lalu memverifikasi checksum berkas. Target berisi data tidak ditimpa. Sumber yang sudah dimigrasikan dikenali lewat checksum; pengulangan tidak mengimpor ulang.
4. Jalankan `npm start`. Dengan `DATABASE_URL` terisi, aplikasi menggunakan Supabase. SQLite sumber tetap ada; jangan menjalankan backend lama bersamaan. Setelah cloud menerima perubahan baru, SQLite lama bukan salinan terkini.

Untuk instalasi Supabase kosong tanpa data lama, jalankan `npm run db:setup` sebelum memulai server. Schema tidak dibuat ulang setiap request/cold start. Koneksi pooler memakai driver `pg` tanpa named prepared statement; TLS Supabase diverifikasi memakai CA di `server/certs/`. API runtime memakai koneksi pooled yang dilepas setelah transaksi.

Foto dan materi dikirim browser langsung ke URL unggah bertanda tangan, lalu endpoint penyelesaian memeriksa pemilik, ukuran, dan signature berkas sebelum mengaitkannya dengan data aplikasi. API download mengecek hak akses sebelum memberi URL baca berlaku 120 detik. URL tersebut merupakan akses sementara dan perlu diperlakukan sebagai rahasia selama berlaku. Bucket tidak publik; schema database tidak diekspos ke klien, RLS aktif. Berkas tak selesai yang kedaluwarsa tidak masuk materi/aktivitas; pembersihan objek yatim belum otomatis.

Deploy Vercel:

- Impor repo sebagai proyek Vite. `vercel.json` membangun `dist` dan meneruskan `/api/*` ke `api/index.js` (Node Function).
- Isi variabel Supabase, seluruh `MAIL_*`, `CURATION_EMAIL`, `APP_ORIGIN=https://domain-aplikasi`, `NODE_ENV=production`, `TRUST_PROXY=1`. Rahasia tidak berada dalam hasil build frontend.
- Konfigurasi domain `APP_ORIGIN` harus sesuai agar verifikasi email dan pemeriksaan origin menuju aplikasi yang benar.
- Data, `.env`, dan database lokal dikecualikan lewat `.vercelignore`. Deployment menolak fallback SQLite.
- Jalankan `npm test`, `npm run test:postgres`, `npm run test:e2e`, `npm run build`. Tes PostgreSQL menggunakan PGlite terisolasi; tes browser memakai SQLite terpisah, bukan Supabase produksi. Pemeriksaan koneksi/API/Storage Supabase dilakukan terpisah tanpa mengirim email.

Pembatasan percobaan login bawaan masih berbasis memori per instance. Untuk deployment banyak instance, pasang rate limiting bersama atau aturan firewall Vercel sebelum membuka trafik besar.

Pilihan **Akses akun Anda** hanya berada di halaman Super Admin. Halaman Warga, Petugas dan BI tidak menampilkan pilihan pindah role. Hak akses tetap diperiksa backend, termasuk saat alamat internal dibuka langsung.

## Landing page, profil wajib, dan kuis mingguan

Alamat `/` menjadi landing page publik; `/warga/` tetap aplikasi warga. Headline terdiri dari satu pengantar aksi dan dua bagian komunitas/belajar, mengikuti pola hero dan blok informasi iLitterless dengan palet COBI. Statistik dan enam aksi terbaru dibaca dari `/api/public/overview`; kegagalan koneksi menampilkan status belum tersedia, bukan angka nol contoh.

Definisi statistik: komunitas = nama asal komunitas unik dari profil lengkap; anggota = jumlah profil lengkap dengan asal komunitas; sampah = jumlah kg seluruh setoran BSIL; kegiatan komunitas = aksi disetujui dari anggota komunitas tersebut. Kegiatan pending/ditolak tidak dipublikasikan. Feed publik/beranda tidak menyertakan nama warga, nomor WhatsApp atau email. Foto kegiatan hanya ditampilkan setelah aksi disetujui petugas.

Setelah verifikasi pendaftaran, peserta wajib mengisi nama lengkap, jenis asal (komunitas/instansi/event/lainnya), sebutkan asal, WhatsApp, kecamatan, dan kota/kabupaten. Profil bisa diperbarui lewat Saya → Edit profil. Peserta lama yang belum lengkap juga mendapat formulir ini; petugas/BI tetap bisa memakai dashboard sesuai role. Server menolak pencatatan, penukaran, dan penyelesaian belajar sebelum profil lengkap. Nomor kontak dan data profil pribadi tidak dikirim pada laporan BI.

Kuis: `/api/quiz` menyediakan tepat 10 soal pada periode Minggu 00.00 WIB sampai Minggu berikutnya. Tiap jawaban disimpan segera, hanya sekali; 10 jawaban selesai mengunci upaya minggu tersebut. Jawaban benar 1 poin, salah 0. Riwayat/poin minggu lama tetap disimpan. Pergantian minggu dihitung server tanpa cron; server menolak kiriman dengan kunci minggu lama. Kunci jawaban dan penjelasan dikirim hanya untuk soal yang sudah dijawab.

Petugas membuka **Kelola kuis**, mengedit teks, pilihan, jawaban benar dan penjelasan untuk tepat 10 soal. Minggu yang sudah memiliki jawaban peserta terkunci; petugas bisa menyiapkan minggu berikutnya. Soal awal disediakan sebagai bank awal; bila tidak ada penerbitan baru, bank terakhir diteruskan, sehingga reset berarti kesempatan menjawab baru dan bukan jaminan pertanyaan berbeda. Set awal bersumber dari praktik umum pengurangan/pemilahan sampah dan dapat ditinjau tim.

Uji mencakup profil wajib, validasi dan kerahasiaan kontak, 10 jawaban terkunci, permintaan ganda paralel, batas Sabtu 23.59.59/Minggu 00.00 WIB, penyuntingan soal, statistik aktual, serta alur browser mobile/desktop.

Lingkungan lokal saat ini: `DATABASE_URL` dan `SUPABASE_URL` dikosongkan pada `.env`, sementara konfigurasi cloud tersimpan sebagai komentar untuk digunakan nanti. `npm start` menggunakan `data/bibubebo.sqlite` dan penyimpanan berkas lokal. Backup sebelum aktivasi ada di `data/backups/before-local-activation-*.sqlite`. Saldo poin lokal diverifikasi tetap sama setelah pembaruan aturan kuis. Ini memakai snapshot SQLite yang tersedia; perubahan yang hanya ada di Supabase tidak disalin otomatis ke lokal. Untuk kembali ke cloud, aktifkan kembali kedua URL yang valid dan restart backend.

Akses kuis warga: **Beranda → Kuis minggu ini → Buka kuis mingguan**. Kuis tidak berada di navbar utama. Bagian kuis mempunyai tombol **Kembali ke Beranda**; aturan mingguan, poin, dan riwayat tetap sama.

## Pembaruan tampilan COBI

Nama produk sekarang **COBI**, dengan penjelasan persis **Community Base Of iLitterless Indonesia** di bawah nama pada header/halaman masuk. Nama/ID kartu Bibu, akun, sesi, dan saldo tetap memakai data yang sudah ada. Peluncur baru `Jalankan COBI.command` tersedia; peluncur lama masih bisa digunakan.

Petugas → **Database warga** memiliki filter gabungan: pencarian nama/Bibu ID/asal/wilayah, jenis asal (Komunitas, Instansi, Event, Lainnya, Belum diisi), nama asal, kota/kabupaten, kecamatan dan kelurahan. Pilihan nama asal mengikuti jenis asal; pilihan kecamatan mengikuti kota. Filter tersimpan saat berganti tab selama sesi halaman. Tombol reset mengembalikan semua pilihan; penghitung menunjukkan jumlah hasil. Kolom asal dan wilayah ikut ditampilkan pada tabel.

Video YouTube: dokumen tetap memakai kebijakan `no-referrer`, sedangkan iframe video memakai `strict-origin-when-cross-origin` agar penyedia menerima origin aplikasi. Ini memperbaiki konfigurasi yang menyebabkan error 153 ketika identitas embed tidak terkirim; sesuai [panduan resmi YouTube](https://support.google.com/youtube/answer/171780). Tombol Tonton di YouTube/Vimeo membuka tautan sumber jika penyedia membatasi embed atau browser menolaknya. Pengujian browser memeriksa HTTP Referer aktual pada permintaan iframe, bukan mengasumsikan semua video pihak ketiga dapat diputar.

Komunitas kini memiliki sapaan dan maskot, jumlah anggota/aksi nyata, penanda peringkat, kontribusi pribadi, serta aksi komunitas yang ada dalam daftar terbaru. Tombol Perbarui komunitas mengambil data ulang dan menampilkan waktu pengambilan dalam WIB. Animasi masuk singkat dan dapat dinonaktifkan melalui reduced motion; tidak ada jumlah aktivitas/anggota online buatan.

Halaman Saya memakai dua kelompok kolom pada desktop (identitas/profil/komunitas dan riwayat/lencana/pengaturan), satu kolom pada mobile. Profil lengkap ditata sebagai daftar label/nilai; tombol peran tersusun sejajar dan aksi bantuan/keluar dipisahkan pada bagian bawah.

## Super Admin

Halaman `/super-admin/` khusus role `superadmin`, terpisah dari Petugas (`admin`). Super Admin awal pada database lokal: `suryaindra019@gmail.com`; password dan role sebelumnya tidak berubah. Pemberian awal dilakukan satu kali lewat terminal, bukan aturan otomatis berdasarkan email pendaftar.

**Pengguna & role** menyediakan pencarian nama/email dan hasil 20 akun per halaman. Pilih kombinasi Warga, Petugas iLitterless, Bank Indonesia, atau Super Admin, lalu Simpan akses. Minimal satu role harus tersisa. Email warga harus terverifikasi sebelum mendapat akses internal. Perubahan tidak mengganti password dan berlaku pada permintaan berikutnya dengan sesi yang sama. Role utama yang dicabut ikut diganti dengan salah satu role yang tersisa. Profil warga dibuat bila akun internal baru diberi role Warga.

**Riwayat perubahan** mencatat pengubah, akun tujuan, waktu WIB, serta role sebelum/sesudah. Perubahan identik tidak menambah riwayat. Super Admin terakhir tidak bisa dicabut, termasuk saat dua permintaan pencabutan berlangsung bersamaan. API mengunci transaksi dan memeriksa ulang kewenangan pengubah. Respons pengelolaan tidak memuat hash password/token. `superadmin` memberi hak kelola akses; akses operasional lain ditentukan oleh role yang juga diberikan.

Pilihan pindah halaman hanya muncul di Super Admin, sesuai role akun tersebut. Warga biasa ditolak ketika membuka dashboard/API internal; header palsu tidak menambah role. Saat memakai konteks Warga, bahkan akun dengan beberapa role harus membuka Super Admin untuk mengelola akses.

SQLite membuat tabel `super_admins` dan `role_changes` saat startup. Untuk Supabase yang telah disiapkan sebelumnya, jalankan `npm run db:setup` dengan koneksi cloud valid sebelum memakai fitur ini; schema privat/RLS juga mencakup kedua tabel baru. Bootstrap lewat terminal tersedia dengan `npm run role:grant -- --email EMAIL --roles superadmin`. Untuk instalasi baru tanpa akun, operator dapat memakai `npm run user:create -- --email EMAIL --role superadmin`.

Statistik landing mengambil data dari database saat dibuka, setiap 30 detik selama tab terlihat, dan saat kembali ke tab. Waktu pembaruan ditampilkan; kegagalan memperbarui dibedakan dari angka nol.

Foto pada kegiatan terbaru menggunakan `/api/public/activity-photos/:id`. Endpoint memeriksa status disetujui setiap kali diminta; ID pending/ditolak/tanpa foto mendapat 404. Path foto privat tidak dibocorkan pada feed. Foto asli milik aksi yang disetujui dapat dibaca publik melalui endpoint ini (atau tautan Storage sementara 120 detik), sesuai permintaan publikasi foto kegiatan. Nama, WhatsApp dan email tetap privat. Beranda saat ini menampilkan enam kegiatan terbaru; belum ada tombol muat lebih banyak untuk melihat seluruh kegiatan.

Kelola kegiatan tersedia melalui Petugas → Kelola kegiatan dan Super Admin → Kelola kegiatan. Daftar menyediakan pencarian, filter status, dan paginasi 12 kegiatan. Petugas dapat menyembunyikan kegiatan disetujui dari feed/foto publik tanpa mengubah poin/statistik, menampilkan kembali, atau membatalkan kegiatan dengan alasan. Pembatalan mempertahankan catatan, mengeluarkannya dari angka aksi sah dan mengoreksi poin aksi sekali. Bonus historis yang sudah dibekukan tidak dihitung ulang.

Hanya konteks Super Admin dapat menghapus permanen, dengan alasan dan konfirmasi HAPUS. Foto yang tidak dirujuk catatan lain dibersihkan; kegagalan pembersihan tampil di riwayat dan dapat dicoba ulang. Riwayat menyimpan pelaku, alasan dan koreksi poin. Voucher yang sudah ditukar tetap tersimpan; koreksi dapat menghasilkan saldo minus. ID kegiatan tidak dipakai ulang dan outbox lama tidak bisa membuat ulang kegiatan yang dihapus. SQLite menambah tabel activity_changes saat startup; instalasi PostgreSQL perlu menjalankan db:setup untuk schema terbaru.

Super Admin → Kelurahan mengelola daftar pendaftaran secara dinamis. Tambah satu nama atau impor CSV/TXT satu kolom (judul opsional Kelurahan), maksimal 1.000 baris/150 KB. Pratinjau menunjukkan nama baru dan duplikat; validasi gagal membatalkan seluruh impor. Nama duplikat tidak membedakan huruf besar/kecil. Kelurahan dapat dinonaktifkan tanpa mengubah warga/riwayat yang sudah ada; minimal satu harus aktif. Daftar tersedia dengan pencarian dan 20 baris per halaman. Laporan tetap mencakup kelurahan nonaktif.

Super Admin → Pengguna & role menyediakan Reset password (tautan email sekali pakai 15 menit, pengiriman ulang minimal satu menit) dan Hapus akun (alasan + ketik HAPUS). Password tidak ditampilkan ke admin. Penghapusan mencabut seluruh sesi/login, menghapus grant dan token, serta menyamarkan nama/email/WhatsApp/asal profil. Akun sendiri dan Super Admin terakhir dilindungi. Profil yang dihapus tidak muncul dalam database warga/pencatatan baru; riwayat kegiatan, foto, artikel, setoran, voucher dan audit tetap disimpan, sehingga angka historis dapat tetap dihitung. Ini bukan penghapusan seluruh bukti historis. Semua tindakan tersedia di Riwayat pengelolaan.

Database warga petugas: buka Lihat profil pada kolom Nama untuk nama, email, WhatsApp, jenis/nama asal, kelurahan, kecamatan, kota/kabupaten, dan status kelengkapan. Pencarian juga menerima email/WhatsApp; Bank Indonesia tetap tidak menerima detail kontak profil.

Schema terbaru menambah tabel privat admin_changes. SQLite membuatnya saat startup; sebelum memakai fitur pada deployment PostgreSQL/Vercel, jalankan npm run db:setup memakai DATABASE_URL produksi. Tidak perlu menambahkan tabel kelurahan terpisah: daftar tersimpan dalam state yang sudah dilindungi transaksi database.

Modul PDF sekarang dibaca langsung di dialog Belajar, dengan navigasi halaman, lompat halaman, ukuran pas lebar/100–200%, dan teks hasil ekstraksi per halaman. PDF lama dikenali dari nama berkas; unggahan baru juga menyimpan MIME. PowerPoint/Word tetap memakai tautan buka/unduh. Pembaca dimuat hanya saat membuka PDF, menggunakan PDF.js (https://mozilla.github.io/pdf.js/examples/) dan worker/font/CMap/WASM yang disertakan build; dokumen tetap diakses melalui endpoint privat berlogin. Berkas rusak/password-protected menampilkan pesan dan tautan buka di tab baru. PDF yang berupa gambar tidak selalu memiliki teks ekstraksi. Tombol selesai tetap merupakan pengakuan peserta, bukan bukti membaca seluruh halaman.
