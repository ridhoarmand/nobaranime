# Rencana Penanganan Bypass Video Provider (Filedon / Vidhide)

## Latar Belakang Masalah
Saat ini aplikasi Frontend (React / Vite) menampung raw Iframe embed links dari API (misalnya: `https://filedon.co/embed/tV1yhcvfMz`). Kekurangannya:
1. Pemutar video dirender sepenuhnya oleh pihak ketiga.
2. Sering memunculkan halaman **Pop-up / Pop-under (Iklan Judi, dll)** saat user berinteraksi.
3. Aturan `sandbox` sering di-counter oleh script anti-sandbox mereka sehingga video menolak diputar jika tidak diberi ruang pop-up.

## Analisis Struktural Embed
Berdasarkan hasil bongkaran script terhadap link `filedon.co/embed/xxx`:
- Server mereka **masih menyimpan link direct video mentahnya** (dalam format `.mp4`).
- Link ini disematkan di dalam atribut HTML bernama `data-page` dalam bentuk JSON Object raksasa (implementasi framework Inertia.js).
- Link mentah (Direct link) tersebut biasanya menunjuk langsung keruang storage cloudflare seperti:
  `https://filedon.xxxx.r2.cloudflarestorage.com/.../video.mp4`

## Keterbatasan Sistem (Kenapa harus Backend?)
Walaupun URL murni tersebut ada di dalam HTML mereka:
- Ekstraksi tidak bisa dilakukan di client-side (Frontend React).
- `fetch()` dari peramban client ke `filedon.co` akan selalu diblokir keras secara struktural oleh peramban karena memicu pelanggaran sistem kemananan **SOP (Same-Origin Policy)** & diblokir oleh server via **CORS (Cross-Origin Resource Sharing)**.
- Public Proxy CORS tidak bekerja karena Filedon memiliki perlindungan **Cloudflare**. Cloudflare dengan mudah mem-blockir IP Public Proxy dengan Captcha *bot protection*.

## Rencana Eksekusi Penyelesaian (Backend / API Proxying)
Untuk mendapatkan video bebas iklan seutuhnya ke dalam Frontend React:

### Tahap 1: Persiapan Server Bypass (Backend)
Karena Fronted kita **(Vite)** bersifat *statis*, kita membutuhkan sebuah mini Web Server backend (Node.js/Express, Python/FastAPI, atau Next.js/Nitro API Route) atau menyematkannya pada repo Scraper saat ini.
Tugas Backend ini:
1. Menerima request dari Frontend kita: `GET /api/bypass?url=https://filedon...`
2. Backend akan meluncurkan request `Axios`/`Undici` murni ke server Filedon. (Karena eksekusinya terjadi di lingkungan Server Node, hal ini *tidak terpengaruh oleh limitasi CORS*).
3. Backend membaca respon string HTML, lalu menerapkan *Regular Expression (RegEx)* untuk mengambil konten atribut `data-page`.
   - *Parsing string Regex JSON Inertia.*
   - *Navigasi ke properti: `props.file.url`.*
4. Mengembalikan Object JSON murni ke Frontend, misalnya: `{ direct_url: "...mp4" }`

### Tahap 2: Menyesuaikan Frontend
Setelah link murni `.mp4` berhasil diekstrak API:
1. Hapus fitur `iframe` pada `src/components/anime/AnimePlayer.tsx`.
2. Install sebuah pustaka Video Player Moderen yang kompeten dengan *Custom Controls* seperti `Plyr`, `ArtPlayer`, atau `Video.js` (Bahkan tag HTML5 `<video>` default pun cukup).
3. `AnimePlayer` diubah untuk mengeksekusi Fetching ke endpoint *Bypasser* kita terlebih dahulu secara dinamis saat streaming berganti, lalu memasukkan link mp4 mentahnya ke komponen `<Video>`.

**Hasil Akhir**: User menonton menggunakan sistem native player, kontrol bisa dimodifikasi bebas, dan bebas dari 100% pop-up advertisement.
