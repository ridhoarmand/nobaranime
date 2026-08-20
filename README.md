# NobarAnime 🎬 (Fullstack Suite)

NobarAnime adalah platform *streaming* anime modern yang dibangun sebagai **Fullstack Application & Scraper Suite** dalam **1 Single Container**. Aplikasi ini menggabungkan antarmuka pengguna (Frontend React 19 SPA) dan backend scraping engine (Hono + Bun + MySQL) ke dalam satu kesatuan yang ringan, cepat, dan mudah di-deploy tanpa membutuhkan API Key atau layanan pihak ketiga eksternal seperti Supabase.

---

## ⚡ Tech Stack

| Layer | Teknologi |
| :--- | :--- |
| **Frontend (`client/`)** | React 19, Vite, Tailwind CSS v4, TanStack Query, React Router v7, LocalStorage State |
| **Backend (`server/`)** | Bun Runtime, Hono, Drizzle ORM, MySQL, Cheerio Scraper, node-cron Scheduler |
| **Container / Ops** | Multi-Stage Dockerfile (Single All-in-One Container), Docker Compose, GitHub Actions CI/CD, Portainer |

---

## 📁 Struktur Direktori Monorepo

```
nobaranime/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── src/                    # Components, Pages, Hooks, Lib
│   ├── public/                 # Static assets & PWA icons
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Backend API & Scraper Engine (Hono + Bun)
│   ├── src/
│   │   ├── db/                 # Drizzle schema & MySQL connection
│   │   ├── services/           # Scraper & cron scheduler
│   │   ├── index.ts            # Hono server (API router + Static SPA server)
│   │   └── agent.ts            # CLI scraper runner
│   ├── drizzle/                # Database migrations
│   ├── package.json
│   └── tsconfig.json
│
├── Dockerfile                  # Multi-Stage Build -> 1 Single Container Image
├── docker-entrypoint.sh        # Startup script
├── docker-compose.yml          # Production stack definition
├── docker-compose.dev.yml      # Local development stack (with local MySQL)
├── .env.example                # Centralized environment variables template
└── package.json                # Root workspace scripts runner
```

---

## 🚀 Panduan Pengembangan Lokal (Local Development)

### 1. Prasyarat
- [Bun](https://bun.sh) (v1.0+)
- [Node.js](https://nodejs.org) (v20+) & npm
- Database MySQL (v5.7+ / v8.0+)

### 2. Setup Environment
Salin file `.env.example` menjadi `.env` di root project:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi `DATABASE_URL` dengan database MySQL Anda.

### 3. Install Dependensi
```bash
# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && bun install && cd ..
```

### 4. Setup Database Schema
```bash
npm run db:push
```

### 5. Jalankan Aplikasi
```bash
# Jalankan client (Vite) & server (Bun) secara bersamaan:
npm run dev

# Atau jalankan secara terpisah:
npm run dev:client   # Frontend di http://localhost:5173
npm run dev:server   # Backend di http://localhost:8000
```

---

## 📦 Deployment Menggunakan Docker (1 Single Container)

Aplikasi ini dikemas ke dalam **1 single container** yang menyajikan Frontend UI, API REST, dan Scraper Scheduler secara bersamaan di port `8000`.

### Menjalankan dengan Docker Compose
```bash
docker compose up -d --build
```
Aplikasi akan aktif di `http://localhost:8000`.

### Menjalankan Manual dengan Docker
```bash
# 1. Build Image
docker build -t nobaranime:latest .

# 2. Run Container
docker run -d \
  --name nobaranime \
  -p 8000:8000 \
  --env-file .env \
  nobaranime:latest
```

---

## 🤖 Manual Scraper Commands

Anda dapat menjalankan scraper secara manual melalui CLI:

```bash
npm run agent:check           # Cek rilis episode baru secara cepat
npm run agent:ongoing         # Scrape anime ongoing
npm run agent:schedule        # Update jadwal tayang anime
```

---

## 📡 API Endpoints Overview

Semua endpoint API tersedia langsung di path `/api/*` tanpa perlu autentikasi API Key:

- `GET /health` — Health check server
- `GET /api/ongoing?page=1` — Daftar anime Ongoing
- `GET /api/latest-episodes?page=1` — Rilis episode terbaru (Ongoing + Completed)
- `GET /api/completed?page=1` — Daftar anime Completed
- `GET /api/search?q=naruto` — Pencarian anime
- `GET /api/anime/:slug` — Detail anime lengkap + daftar episode
- `GET /api/episode/:slug` — Detail episode + video streams & download links
- `GET /api/genres` — Daftar seluruh genre anime
- `GET /api/schedule` — Jadwal tayang mingguan
