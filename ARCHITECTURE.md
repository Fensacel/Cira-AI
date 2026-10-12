# Arsitektur Teknis: Cira AI (Web App)

**Versi:** 0.2 (Draft)
**Acuan:** `PRD.md`, `SYSTEM_PROMPT.md`

---

## 1. Tech Stack

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| Framework | Next.js (App Router) + TypeScript | Full-stack dalam satu repo, route handler untuk API |
| UI | React + Tailwind CSS | Komponen chat cepat dibuat, responsif |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/*`) | Streaming, `useChat`, abstraksi multi-provider |
| Provider | `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/deepseek`, provider Llama (mis. via Groq atau Together) | Pilihan model dari satu API |
| Markdown | `react-markdown` + `remark-gfm` | Tabel, list, heading |
| LaTeX | `remark-math` + `rehype-katex` (KaTeX) | `$...$` dan `$$...$$` |
| Syntax highlight | `shiki` | Code block berwarna |
| Penyimpanan chat | IndexedDB via `idb` (atau Dexie) | Riwayat di browser, tanpa database server |
| Rate limit | `@upstash/ratelimit` + Upstash Redis (atau in-memory untuk dev) | Batas request per IP |
| Validasi | `zod` | Validasi payload request di server |
| Hosting | Vercel | Deploy dan edge/serverless |
| Testing | Vitest + React Testing Library + Playwright | Unit, komponen, E2E |
| Linting | ESLint + Prettier | Konsistensi kode |

> Catatan: Provider Llama bergantung pada penyedia hosting (mis. Groq, Together, atau Ollama untuk lokal). Pilih satu saat implementasi.

---

## 2. Arsitektur Tingkat Tinggi

```
┌──────────────────────── Browser ────────────────────────┐
│  Next.js Client (React)                                 │
│  ┌────────────────────────────────────────────────┐     │
│  │ Chat UI   Markdown + LaTeX   Sidebar riwayat   │     │
│  │ useChat (streaming)          IndexedDB         │     │
│  └──────────────┬─────────────────────────▲───────┘     │
└─────────────────┼─────────────────────────┼─────────────┘
                  │ POST /api/chat (SSE)    │ riwayat lokal
                  ▼                         │
┌──────────────── Vercel (Next.js Server) ──┴─────────────┐
│  Route Handler  /api/chat                               │
│   1. Validasi (zod) dan rate limit per IP               │
│   2. Ambil system prompt dari lib/prompts/system.ts     │
│   3. providers.ts memilih model dari modelId            │
│   4. streamText() dari Vercel AI SDK                    │
└──────────────┬──────────────────────────────────────────┘
               │ HTTPS (API key dari environment variable)
               ▼
   Provider AI (Anthropic, OpenAI, DeepSeek, Llama)
```

**Prinsip:**
- API key hanya ada di server (environment variable). Browser tidak pernah melihatnya.
- Server tidak menyimpan percakapan. Riwayat hanya di IndexedDB pengguna.
- Streaming memakai `toUIMessageStreamResponse()` dan hook `useChat`.

---

## 3. Struktur Folder (Usulan)

```
cira-ai/
├── PRD.md
├── ARCHITECTURE.md
├── SYSTEM_PROMPT.md
├── README.md
├── .env.example
├── package.json
├── next.config.ts
├── tsconfig.json
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Halaman chat utama
│   ├── globals.css
│   └── api/
│       └── chat/
│           └── route.ts            # POST: streaming chat
├── components/
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   ├── MarkdownView.tsx            # react-markdown + remark-math + rehype-katex
│   ├── CodeBlock.tsx               # shiki + tombol salin
│   ├── Sidebar.tsx                 # daftar riwayat chat
│   ├── ModelSelect.tsx
│   └── ChatInput.tsx
├── hooks/
│   └── useChatHistory.ts           # CRUD riwayat di IndexedDB
├── lib/
│   ├── providers.ts                # Factory model (Anthropic, OpenAI, DeepSeek, Llama)
│   ├── models.ts                   # Daftar model yang diizinkan
│   ├── rate-limit.ts
│   ├── db.ts                       # IndexedDB client
│   └── prompts/
│       └── system.ts               # Prompt final dari SYSTEM_PROMPT.md
└── tests/
```


---

## 4. Alur Data Utama

### 4.1 Kirim Pesan dan Streaming

1. Pengguna mengetik pesan. Hook `useChat` mengirim `POST /api/chat` dengan `{ messages, modelId }`.
2. Route handler memvalidasi payload dengan `zod` dan memeriksa rate limit per IP.
3. Handler mengambil `system` dari `lib/prompts/system.ts`, memilih model lewat `lib/providers.ts`, lalu memanggil `streamText`.
4. Respons dikirim sebagai stream (`toUIMessageStreamResponse()`).
5. Client merender token secara bertahap sebagai Markdown dan LaTeX.
6. Setelah selesai, pesan lengkap disimpan ke IndexedDB.
7. Jika pengguna menekan stop, `useChat` membatalkan request (`stop()`) dan server menghentikan stream lewat `abortSignal`.

### 4.2 Riwayat Chat

1. Setiap chat memiliki `id`, `title`, `modelId`, `createdAt`, `updatedAt`, dan daftar `messages`.
2. Data disimpan di IndexedDB store `chats`.
3. Sidebar membaca daftar chat diurutkan dari `updatedAt` terbaru.
4. Menghapus chat menghapus record terkait secara lokal. Server tidak terlibat.

### 4.3 Pemilihan Model

1. `lib/models.ts` berisi daftar model yang diizinkan (whitelist) beserta provider-nya.
2. Client hanya mengirim `modelId` dari daftar tersebut.
3. Server menolak `modelId` yang tidak ada di whitelist dengan status 400.

---

## 5. Kontrak API

| Endpoint | Method | Payload | Respons |
|----------|--------|---------|---------|
| `/api/chat` | POST | `{ messages: UIMessage[], modelId: string }` | Stream (SSE) token dan status selesai |
| `/api/models` | GET | - | `{ models: { id, label, provider }[] }` |

**Error yang dikembalikan:**

| Status | Kondisi |
|--------|---------|
| 400 | Payload tidak valid atau `modelId` tidak ada di whitelist |
| 429 | Rate limit terlampaui (sertakan header `Retry-After`) |
| 500 | Error provider atau server (pesan generik ke client, detail ke log) |

---

## 6. Konfigurasi Environment

```bash
# .env.example
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
LLAMA_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Variabel yang kosong menonaktifkan model dari provider tersebut di `lib/models.ts`.

---

## 7. Keamanan

| Area | Kontrol |
|------|---------|
| API key | Hanya di environment variable server; tidak masuk bundle client; tidak masuk log |
| Input | Validasi `zod`; batasi panjang pesan dan jumlah pesan per request |
| Markdown | `react-markdown` tanpa `rehype-raw`; HTML mentah tidak dirender |
| Rate limit | Per IP di route `/api/chat`, balas 429 saat terlampaui |
| Header | Content Security Policy dan `X-Content-Type-Options` lewat `next.config.ts` |
| Data | Riwayat hanya di IndexedDB; server tidak menyimpan percakapan |
| Prompt injection | System prompt dikirim sebagai `system`, bukan digabung dengan input pengguna |

---

## 8. Performa

- Lazy-load `shiki` dan KaTeX (`next/dynamic`) agar bundle awal kecil.
- Throttle render Markdown saat streaming (mis. update maksimal tiap 50 ms).
- Virtualisasi daftar pesan (mis. `react-virtuoso`) jika chat lebih dari 200 pesan.
- Gunakan Edge runtime untuk route `/api/chat` jika kompatibel dengan provider yang dipakai.

---

## 9. Testing & Kualitas

| Jenis | Alat | Cakupan |
|-------|------|---------|
| Unit | Vitest | `lib/providers.ts`, `lib/models.ts`, validasi `zod` |
| Komponen | React Testing Library | `MarkdownView` (LaTeX, tabel), `CodeBlock` (salin) |
| Integrasi | Vitest + mock provider | Route `/api/chat` (400, 429, stream) |
| E2E | Playwright | Kirim pesan, stop stream, buat chat baru, riwayat tetap ada setelah reload |
| Regresi prompt | Uji manual | 5 test case di `SYSTEM_PROMPT.md` |

---

## 10. Rencana Rilis

1. Setup proyek Next.js + TypeScript + Tailwind.
2. Implementasi `lib/models.ts`, `lib/providers.ts`, dan route `/api/chat`.
3. Implementasi UI chat dengan `useChat`.
4. Implementasi render Markdown, LaTeX, dan code block.
5. Implementasi riwayat chat (IndexedDB).
6. Implementasi rate limit dan validasi.
7. QA, lalu deploy ke Vercel.
