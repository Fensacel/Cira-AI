# AIgweh

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
| `SYSTEM_PROMPT.md` | System prompt AIgweh dan test case |

## Persyaratan

- Node.js LTS (20 atau lebih baru)
- npm atau pnpm

## Setup (Rencana)

```bash
cp .env.example .env.local   # isi API key provider
npm install
npm run dev                  # http://localhost:3000
```

> Perintah di atas berlaku setelah proyek Next.js dibuat sesuai `ARCHITECTURE.md`.

## Environment Variables

Lihat `.env.example`. API key hanya dibaca di server. Variabel yang kosong menonaktifkan provider terkait.

## Lisensi

Belum ditentukan.
