# Cira AI

Aplikasi chat AI berbasis web yang serba bisa (All-in-One Expert) untuk **koding, matematika, sains, analisis data, dan penulisan kreatif**. Default berbahasa Indonesia.

> Status: **Draft / Pra-pengembangan**

## Fitur (MVP)

- Chat AI dengan streaming
- Markdown, code block dengan tombol salin, dan LaTeX (`$...$`, `$$...$$`)
- Riwayat chat tersimpan di browser (IndexedDB)
- Pilihan model: Claude, OpenAI, DeepSeek, Llama
- Rate limit per IP

## Tech Stack

Next.js (App Router), TypeScript, Tailwind CSS, Vercel AI SDK, KaTeX, shiki, Vercel (deploy). Detail di `ARCHITECTURE.md`.

## Dokumentasi

| File | Isi |
|------|-----|
| `PRD.md` | Product Requirements Document |
| `ARCHITECTURE.md` | Arsitektur, struktur folder, API, keamanan |
| `SYSTEM_PROMPT.md` | System prompt Cira AI dan test case |

## Persyaratan

- Node.js LTS (20 atau lebih baru)
- npm atau pnpm

## Setup

```bash
cp .env.example .env.local   # isi NINEROUTER_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

Pastikan 9router sudah berjalan di `http://localhost:20128` sebelum menjalankan aplikasi.

## Script

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Jalankan server development |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | Jalankan ESLint |
| `npm run test` | Jalankan test dengan Vitest |
| `npm run typecheck` | Cek tipe TypeScript (`tsc --noEmit`) |

## Environment Variables

Lihat `.env.example`. API key hanya dibaca di server dan tidak boleh masuk ke browser.

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `NINEROUTER_BASE_URL` | Ya | Base URL 9router, default `http://localhost:20128/v1` |
| `NINEROUTER_API_KEY` | Ya | API key dari dashboard 9router (Bearer token) |
| `AIGWEH_MODELS` | Tidak | Daftar model dipisah koma, format `provider/model`. Kosongkan untuk memakai default di `lib/models.ts` |
| `SUPABASE_URL` | Ya | URL project Supabase, untuk penyimpanan memori |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya | Service role key Supabase. Hanya server, jangan dikirim ke browser |

Jalankan `supabase/schema.sql` di SQL Editor Supabase sebelum memakai memori.

Jangan commit file `.env` atau `.env.local`. Keduanya sudah masuk `.gitignore`.

## Lisensi

Belum ditentukan.
