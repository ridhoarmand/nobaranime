# OtakuDesu API Documentation

Base URL: `http://anime-api.idho.eu.org/`

## Autentikasi

Semua request harus menyertakan header `X-API-Key`.

```http
X-API-Key: MasArmandho-Gantenks
```

Jika API Key tidak valid, akan mengembalikan:

```json
{
  "status": false,
  "message": "Unauthorized: Invalid API Key"
}
```

## Format Response

Semua response menggunakan format:

```json
{
  "status": true,
  "data": ...
}
```

Error response:

```json
{
  "status": false,
  "message": "Not found"
}
```

---

## 1. Health Check

```
GET /
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" http://anime-api.idho.eu.org/
```

**Response:**

```json
{
  "message": "OtakuDesu API",
  "version": "1.0.0",
  "endpoints": {
    "ongoing": "/ongoing?page=1",
    "latest_episodes": "/latest-episodes?page=1",
    "completed": "/completed?page=1",
    "anime_list": "/anime-list?page=1&initial=A",
    "search": "/search?q=naruto",
    "anime": "/anime/:endpoint",
    "episode": "/episode/:endpoint",
    "batch": "/batch/:endpoint",
    "genres": "/genres",
    "genre_anime": "/genres/:genre?page=1",
    "schedule": "/schedule"
  }
}
```

---

## 2. Daftar Anime Ongoing

```
GET /ongoing?page=1
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" "http://anime-api.idho.eu.org/ongoing?page=1"
```

**Query Parameters:**

| Param  | Type   | Default | Deskripsi |
| ------ | ------ | ------- | --------- |
| `page` | number | 1       | Halaman   |

**Response:**

```json
{
  "status": true,
  "page": 1,
  "per_page": 25,
  "total": 103,
  "total_pages": 5,
  "data": [
    {
      "id": 3,
      "title": "Darwin Jihen Subtitle Indonesia",
      "japanese_title": "ダーウィン事変",
      "endpoint": "dwin-jihen-sub-indo",
      "thumb": "https://otakudesu.best/wp-content/uploads/2026/01/darwin-jihen-328e74dbdb.jpg",
      "status": "Ongoing",
      "score": null,
      "producer": "TOHO animation",
      "type": "TV",
      "studio": "Bellnox Films",
      "duration": "24 min.",
      "release_date": "2026-01-07",
      "available_eps": 9,
      "total_eps": null,
      "last_episode_number": 9,
      "last_episode_date": "2026-03-04 06:00:11",
      "broadcast_day": null,
      "synopsis": "...",
      "created_at": "2026-02-18T08:22:17.000Z",
      "updated_at": "2026-03-04T06:00:11.000Z"
    }
  ]
}
```

### Anime Object Fields (Ongoing/Completed)

| Field                 | Type                         | Deskripsi                                                           |
| --------------------- | ---------------------------- | ------------------------------------------------------------------- |
| `id`                  | number                       | ID anime                                                            |
| `title`               | string                       | Judul anime                                                         |
| `japanese_title`      | string \| null               | Judul dalam bahasa Jepang                                           |
| `endpoint`            | string                       | Slug unik untuk detail anime                                        |
| `thumb`               | string                       | URL gambar thumbnail                                                |
| `status`              | `"Ongoing"` \| `"Completed"` | Status anime                                                        |
| `score`               | number \| null               | Skor rating                                                         |
| `producer`            | string \| null               | Produser                                                            |
| `type`                | string \| null               | Tipe (TV, OVA, Movie, BD, dll)                                      |
| `studio`              | string \| null               | Studio                                                              |
| `duration`            | string \| null               | Durasi per episode                                                  |
| `release_date`        | string \| null               | Tanggal rilis (format `YYYY-MM-DD`)                                 |
| `available_eps`       | number                       | Jumlah episode yang sudah tersedia                                  |
| `total_eps`           | number \| null               | Total episode (null jika belum diketahui)                           |
| `last_episode_number` | number \| null               | Nomor episode terakhir yang tersedia                                |
| `last_episode_date`   | string \| null               | Tanggal & jam episode terakhir rilis (format `YYYY-MM-DD HH:mm:ss`) |
| `broadcast_day`       | string \| null               | Hari tayang (Senin-Minggu atau "Random")                            |
| `synopsis`            | string \| null               | Sinopsis                                                            |
| `created_at`          | string                       | Tanggal dibuat (ISO 8601)                                           |
| `updated_at`          | string                       | Tanggal diupdate (ISO 8601)                                         |

**Catatan:**
- `last_episode_number` diambil dari nomor episode terbaru di database.
- `last_episode_date` diambil dari tanggal & jam episode terbaru di database (format `YYYY-MM-DD HH:mm:ss`). Client bisa menghitung "X jam lalu" dari nilai ini.
- Data diurutkan berdasarkan `last_episode_date` terbaru, lalu `updated_at`, lalu `id`.

---

## 2.1. Daftar Anime Terbaru (Latest Episodes)

Endpoint ini mengembalikan rilisan terbaru gabungan dari anime **Ongoing** dan **Completed**.

```
GET /latest-episodes?page=1
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" "http://anime-api.idho.eu.org/latest-episodes?page=1"
```

**Query Parameters:**

| Param  | Type   | Default | Deskripsi |
| ------ | ------ | ------- | --------- |
| `page` | number | 1       | Halaman   |

**Response:**

```json
{
  "status": true,
  "page": 1,
  "per_page": 25,
  "total": 541,
  "total_pages": 22,
  "data": [
    {
      "id": 77,
      "title": "Sousou no Frieren Season 2 Subtitle Indonesia",
      "japanese_title": "葬送のフリーレン 第2期",
      "endpoint": "sousou-frieren-s2-sub-indo",
      "thumb": "https://otakudesu.best/wp-content/uploads/2026/01/154528.jpg",
      "status": "Ongoing",
      "score": 8.99,
      "producer": "TOHO animation",
      "type": "TV",
      "studio": "Madhouse",
      "duration": "24 min. per ep.",
      "release_date": "2026-01-16",
      "available_eps": 11,
      "total_eps": 12,
      "last_episode_number": 11,
      "last_episode_slug": "snf-s2-episode-11-sub-indo",
      "last_episode_date": "2026-03-29 00:00:00",
      "broadcast_day": "Jumat",
      "synopsis": "...",
      "created_at": "2026-02-18T08:37:52.000Z",
      "updated_at": "2026-03-29T01:00:03.000Z"
    },
    {
      "id": 441,
      "title": "Kusuriya no Hitorigoto Season 2 Subtitle Indonesia",
      "japanese_title": "薬屋のひとりごと 第2期",
      "endpoint": "kusuriya-hitorigoto-s2-sub-indo",
      "thumb": "https://otakudesu.best/wp-content/uploads/2026/02/kt2.jpg",
      "status": "Completed",
      "score": 8.7,
      "producer": "TOHO animation",
      "type": "TV",
      "studio": "OLM",
      "duration": "24 min.",
      "release_date": "2026-01-11",
      "available_eps": 12,
      "total_eps": 12,
      "last_episode_number": 12,
      "last_episode_slug": "kt2-episode-12-sub-indo",
      "last_episode_date": "2026-03-28 21:30:00",
      "broadcast_day": "Minggu",
      "synopsis": "...",
      "created_at": "2026-02-19T07:10:12.000Z",
      "updated_at": "2026-03-28T22:00:11.000Z"
    }
  ]
}
```

**Catatan:**
- Cocok untuk halaman "Rilisan Terbaru" di frontend.
- Data tetap menggunakan struktur anime object yang sama dengan `/ongoing` dan `/completed`.

---

## 3. Daftar Anime Completed

```
GET /completed?page=1
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" "http://anime-api.idho.eu.org/completed?page=1"
```

**Query Parameters:** Sama dengan ongoing.

**Response:** Sama format dengan ongoing, hanya `status = "Completed"`.

---

## 4. Anime List (A-Z)

```
GET /anime-list?page=1&initial=A
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" "http://anime-api.idho.eu.org/anime-list?page=1&initial=A"
```

**Query Parameters:**

| Param     | Type   | Default | Deskripsi                                                    |
| --------- | ------ | ------- | ------------------------------------------------------------ |
| `page`    | number | 1       | Halaman                                                      |
| `initial` | string | (semua) | Filter huruf depan judul: `A`-`Z` atau `#` untuk non-alfabet |

**Response:**

```json
{
  "status": true,
  "page": 1,
  "per_page": 25,
  "total": 104,
  "total_pages": 5,
  "initial": "A",
  "filter_info": "Gunakan parameter initial=A-Z atau # untuk filter judul depan. Contoh: /anime-list?initial=A",
  "data": [
    {
      "id": 447,
      "title": "A-Channel BD (Episode 1 – 12) Subtitle Indonesia",
      "japanese_title": "Aチャンネル",
      "endpoint": "channel-subtitle-indonesia",
      "thumb": "https://otakudesu.best/wp-content/uploads/2018/02/A-Channel-Sub-Indo.jpg",
      "status": "Completed",
      "score": 7.04,
      "producer": "Aniplex, Dentsu, Mainichi Broadcasting System",
      "type": "BD",
      "studio": "Studio Gokumi",
      "duration": "24 Menit",
      "release_date": "2011-04-08",
      "available_eps": 15,
      "total_eps": 12,
      "broadcast_day": null,
      "synopsis": "...",
      "created_at": "2026-02-18T10:58:43.000Z",
      "updated_at": "2026-02-18T15:07:21.000Z"
    }
  ]
}
```

> Diurutkan berdasarkan judul (A-Z).

---

## 5. Cari Anime

```
GET /search?q=frieren
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" "http://anime-api.idho.eu.org/search?q=frieren"
```

**Query Parameters:**

| Param | Type   | Required | Deskripsi                               |
| ----- | ------ | -------- | --------------------------------------- |
| `q`   | string | ✅        | Kata kunci pencarian (case insensitive) |

**Response:**

```json
{
  "status": true,
  "data": [
    {
      "id": 77,
      "title": "Sousou no Frieren Season 2 Subtitle Indonesia",
      "japanese_title": "葬送のフリーレン 第2期",
      "endpoint": "sousou-frieren-s2-sub-indo",
      "thumb": "https://otakudesu.best/wp-content/uploads/2026/01/154528.jpg",
      "status": "Ongoing",
      "score": 8.99,
      "producer": "TOHO animation",
      "type": "TV",
      "studio": "Madhouse",
      "duration": "24 min. per ep.",
      "release_date": "2026-01-16",
      "available_eps": 6,
      "total_eps": 10,
      "broadcast_day": "Jumat",
      "synopsis": "",
      "created_at": "2026-02-18T08:37:52.000Z",
      "updated_at": "2026-03-03T01:00:03.000Z"
    }
  ]
}
```

> Maksimal 50 hasil. Tidak ada pagination.

---

## 6. Detail Anime

```
GET /anime/:endpoint
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" http://anime-api.idho.eu.org/anime/sousou-frieren-s2-sub-indo
```

**Path Parameters:**

| Param      | Type   | Deskripsi                 |
| ---------- | ------ | ------------------------- |
| `endpoint` | string | Slug anime (dari listing) |

**Response:**

```json
{
  "status": true,
  "data": {
    "id": 77,
    "title": "Sousou no Frieren Season 2 Subtitle Indonesia",
    "japanese_title": "葬送のフリーレン 第2期",
    "endpoint": "sousou-frieren-s2-sub-indo",
    "thumb": "https://otakudesu.best/wp-content/uploads/2026/01/154528.jpg",
    "status": "Ongoing",
    "score": 8.99,
    "producer": "TOHO animation",
    "type": "TV",
    "studio": "Madhouse",
    "duration": "24 min. per ep.",
    "release_date": "2026-01-16",
    "available_eps": 6,
    "total_eps": 10,
    "broadcast_day": "Jumat",
    "synopsis": "",
    "created_at": "2026-02-18T08:37:52.000Z",
    "updated_at": "2026-03-03T01:00:03.000Z",
    "genres": [
      { "id": 11, "name": "Adventure" },
      { "id": 40, "name": "Drama" },
      { "id": 2, "name": "Fantasy" },
      { "id": 9, "name": "Shounen" }
    ],
    "episodes": [
      {
        "id": 351,
        "title": "Sousou no Frieren Season 2 Episode 1 Subtitle Indonesia",
        "episode_number": 1,
        "endpoint": "snf-s2-episode-1-sub-indo",
        "date": "2026-01-16 00:00:00"
      },
      {
        "id": 350,
        "title": "Sousou no Frieren Season 2 Episode 2 Subtitle Indonesia",
        "episode_number": 2,
        "endpoint": "snf-s2-episode-2-sub-indo",
        "date": "2026-01-23 00:00:00"
      }
    ],
    "batches": []
  }
}
```

### Episode Item Fields

| Field            | Type   | Deskripsi                                                  |
| ---------------- | ------ | ---------------------------------------------------------- |
| `id`             | number | ID episode                                                 |
| `title`          | string | Judul episode                                              |
| `episode_number` | number | Nomor episode                                              |
| `endpoint`       | string | Slug untuk detail episode                                  |
| `date`           | string | Tanggal & jam rilis episode (format `YYYY-MM-DD HH:mm:ss`) |

### Genre Item Fields

| Field  | Type   | Deskripsi  |
| ------ | ------ | ---------- |
| `id`   | number | ID genre   |
| `name` | string | Nama genre |

### Batch Item Fields

| Field      | Type   | Deskripsi               |
| ---------- | ------ | ----------------------- |
| `id`       | number | ID batch                |
| `title`    | string | Judul batch             |
| `endpoint` | string | Slug untuk detail batch |

---

## 7. Detail Episode

```
GET /episode/:endpoint
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" http://anime-api.idho.eu.org/episode/snf-s2-episode-1-sub-indo
```

**Path Parameters:**

| Param      | Type   | Deskripsi                        |
| ---------- | ------ | -------------------------------- |
| `endpoint` | string | Slug episode (dari detail anime) |

**Response:**

```json
{
  "status": true,
  "data": {
    "id": 351,
    "anime_id": 77,
    "title": "Sousou no Frieren Season 2 Episode 1 Subtitle Indonesia",
    "episode_number": 1,
    "endpoint": "snf-s2-episode-1-sub-indo",
    "date": "2026-01-16 00:00:00",
    "created_at": "2026-02-18T08:38:13.000Z",
    "updated_at": "2026-02-18T08:38:13.000Z",
    "anime": {
      "id": 77,
      "title": "Sousou no Frieren Season 2 Subtitle Indonesia",
      "endpoint": "sousou-frieren-s2-sub-indo",
      "thumb": "https://otakudesu.best/wp-content/uploads/2026/01/154528.jpg"
    },
    "streams": [
      {
        "id": 4313,
        "provider": "Default",
        "quality": "Unknown",
        "url": "https://str.desustream.com/dstream/ondesu3/v5/...",
        "is_default": 1
      },
      {
        "id": 4314,
        "provider": "vidhide",
        "quality": "360p",
        "url": "https://odvidhide.com/embed/...",
        "is_default": 0
      },
      {
        "id": 4316,
        "provider": "mega",
        "quality": "360p",
        "url": "https://mega.nz/embed/...",
        "is_default": 0
      }
    ],
    "downloads": {
      "360p": [
        { "provider": "ODFiles", "format": "Mp4", "url": "https://..." },
        { "provider": "Pdrain", "format": "Mp4", "url": "https://..." },
        { "provider": "Mega", "format": "Mp4", "url": "https://..." },
        { "provider": "KFiles", "format": "Mp4", "url": "https://..." }
      ],
      "480p": [
        { "provider": "ODFiles", "format": "Mp4", "url": "https://..." },
        { "provider": "Mega", "format": "Mp4", "url": "https://..." },
        { "provider": "ODFiles", "format": "MKV", "url": "https://..." },
        { "provider": "Mega", "format": "MKV", "url": "https://..." }
      ],
      "720p": [
        { "provider": "ODFiles", "format": "Mp4", "url": "https://..." },
        { "provider": "Mega", "format": "Mp4", "url": "https://..." },
        { "provider": "ODFiles", "format": "MKV", "url": "https://..." },
        { "provider": "Mega", "format": "MKV", "url": "https://..." }
      ],
      "1080p": [
        { "provider": "ODFiles", "format": "Mp4", "url": "https://..." },
        { "provider": "Mega", "format": "Mp4", "url": "https://..." },
        { "provider": "ODFiles", "format": "MKV", "url": "https://..." },
        { "provider": "Mega", "format": "MKV", "url": "https://..." }
      ]
    },
    "prev_episode": null,
    "next_episode": "snf-s2-episode-2-sub-indo"
  }
}
```

### Stream Item Fields

| Field        | Type           | Deskripsi                                            |
| ------------ | -------------- | ---------------------------------------------------- |
| `id`         | number         | ID stream                                            |
| `provider`   | string         | Nama provider (Default, vidhide, mega, filedon, dll) |
| `quality`    | string         | Kualitas stream (Unknown, 360p, 480p, 720p, dll)     |
| `url`        | string \| null | URL iframe embed                                     |
| `is_default` | number         | 1 jika stream utama, 0 jika mirror                   |

### Download Item Fields

Downloads dikelompokkan berdasarkan resolusi (`360p`, `480p`, `720p`, `1080p`).

| Field      | Type   | Deskripsi                                          |
| ---------- | ------ | -------------------------------------------------- |
| `provider` | string | Nama provider (ODFiles, Pdrain, Mega, KFiles, dll) |
| `format`   | string | Format file (Mp4, MKV)                             |
| `url`      | string | URL download                                       |

### Navigation Fields

| Field          | Type           | Deskripsi                    |
| -------------- | -------------- | ---------------------------- |
| `prev_episode` | string \| null | Endpoint episode sebelumnya  |
| `next_episode` | string \| null | Endpoint episode selanjutnya |

---

## 8. Detail Batch

```
GET /batch/:endpoint
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" http://anime-api.idho.eu.org/batch/anime-xyz-sub-indo-batch
```

**Path Parameters:**

| Param      | Type   | Deskripsi                      |
| ---------- | ------ | ------------------------------ |
| `endpoint` | string | Slug batch (dari detail anime) |

**Response:**

```json
{
  "status": true,
  "data": {
    "id": 1,
    "anime_id": 100,
    "title": "Anime XYZ Sub Indo : Episode 1 – 12 (End)",
    "endpoint": "anime-xyz-sub-indo-batch",
    "download_links": {
      "low_quality": [
        { "title": "KFiles", "url": "https://..." },
        { "title": "Mega", "url": "https://..." }
      ],
      "medium_quality": [
        { "title": "KFiles", "url": "https://..." }
      ],
      "high_quality": [
        { "title": "KFiles", "url": "https://..." }
      ]
    },
    "anime": {
      "id": 100,
      "title": "Anime XYZ",
      "endpoint": "anime-xyz-sub-indo",
      "thumb": "https://..."
    }
  }
}
```

---

## 9. Daftar Genre

```
GET /genres
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" http://anime-api.idho.eu.org/genres
```

**Response:**

```json
{
  "status": true,
  "data": [
    { "id": 25, "name": "Action" },
    { "id": 11, "name": "Adventure" },
    { "id": 1, "name": "Comedy" },
    { "id": 40, "name": "Drama" },
    { "id": 2, "name": "Fantasy" },
    { "id": 160, "name": "Isekai" },
    { "id": 23, "name": "Romance" },
    { "id": 7, "name": "School" },
    { "id": 9, "name": "Shounen" }
  ]
}
```

> Diurutkan berdasarkan nama (A-Z).

---

## 10. Anime Berdasarkan Genre

```
GET /genres/:genre?page=1
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" "http://anime-api.idho.eu.org/genres/Action?page=1"
```

**Path Parameters:**

| Param   | Type   | Deskripsi                   |
| ------- | ------ | --------------------------- |
| `genre` | string | Nama genre (dari `/genres`) |

**Query Parameters:**

| Param  | Type   | Default | Deskripsi |
| ------ | ------ | ------- | --------- |
| `page` | number | 1       | Halaman   |

**Contoh:** `GET /genres/Action?page=1`

**Response:**

```json
{
  "status": true,
  "page": 1,
  "per_page": 25,
  "total": 307,
  "total_pages": 13,
  "genre": "Action",
  "data": [
    {
      "id": 58,
      "title": "Yuusha no Kuzu Subtitle Indonesia",
      "japanese_title": "勇者のクズ",
      "endpoint": "yuusha-kuzu-sub-indo",
      "thumb": "https://otakudesu.best/wp-content/uploads/2026/01/Yuusha-no-Kuzu.jpg",
      "status": "Ongoing",
      "score": null,
      "producer": "",
      "type": "TV",
      "studio": "OLM",
      "duration": "23 Min.",
      "release_date": "2026-01-11",
      "available_eps": 8,
      "total_eps": 24,
      "broadcast_day": null,
      "synopsis": "...",
      "created_at": "2026-02-18T08:35:03.000Z",
      "updated_at": "2026-03-04T06:01:34.000Z"
    }
  ]
}
```

---

## 11. Jadwal Tayang

```
GET /schedule
```

Contoh curl:

```bash
curl -H "X-API-Key: MasArmandho-Gantenks" http://anime-api.idho.eu.org/schedule
```

**Response:**

```json
{
  "status": true,
  "data": {
    "Senin": [
      {
        "id": 19355,
        "title": "Seihantai na Kimi to Boku",
        "endpoint": "seihantai-kimi-boku-sub-indo",
        "thumb": "https://...",
        "total_eps": null
      }
    ],
    "Selasa": [...],
    "Rabu": [...],
    "Kamis": [...],
    "Jumat": [...],
    "Sabtu": [...],
    "Minggu": [...]
  }
}
```

### Schedule Item Fields

| Field       | Type           | Deskripsi               |
| ----------- | -------------- | ----------------------- |
| `id`        | number         | ID anime                |
| `title`     | string         | Judul anime             |
| `endpoint`  | string         | Slug untuk detail anime |
| `thumb`     | string         | URL thumbnail           |
| `total_eps` | number \| null | Total episode           |

**Catatan:**
- Jadwal dikelompokkan berdasarkan hari (Senin-Minggu).
- Bisa termasuk hari "Random" jika ada anime dengan jadwal tidak tetap.

---

## Alur Umum Penggunaan

```
1. GET /ongoing atau /latest-episodes atau /completed atau /search atau /anime-list → dapat daftar anime
2. Ambil `endpoint` dari anime yang dipilih
3. GET /anime/{endpoint} → dapat detail + daftar episode + genre
4. Ambil `endpoint` dari episode yang dipilih
5. GET /episode/{endpoint} → dapat streams + downloads + prev/next
6. Gunakan `url` dari streams untuk embed player
7. Gunakan `next_episode` / `prev_episode` untuk navigasi
```

## HTTP Status Codes

| Code | Deskripsi                          |
| ---- | ---------------------------------- |
| 200  | Berhasil                           |
| 400  | Parameter tidak valid              |
| 401  | Unauthorized (API Key tidak valid) |
| 404  | Data tidak ditemukan               |
| 500  | Server error                       |
