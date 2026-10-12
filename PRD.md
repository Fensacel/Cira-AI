# PRD: AIgweh (Web App)

**Versi:** 0.2 (Draft)
**Tanggal:** 2026-10-12
**Platform:** Web (desktop dan mobile browser)

---

## 1. Ringkasan Produk

AIgweh adalah aplikasi chat AI berbasis web yang serba bisa (All-in-One Expert) untuk **koding, matematika, sains, analisis data, dan penulisan kreatif**. Default berbahasa Indonesia dan mengikuti bahasa pengguna.

## 2. Latar Belakang & Masalah

- Pengguna berpindah-pindah antar chatbot untuk tugas berbeda (kode, hitungan, tulisan).
- Jawaban AI umum sering bertele-tele, tidak terstruktur, atau tidak sesuai bahasa pengguna.
- Pengguna Indonesia butuh jawaban Bahasa Indonesia yang santai tapi akurat secara teknis.

## 3. Tujuan Produk

| No | Tujuan | Indikator (KPI) |
|----|--------|-----------------|
| G1 | Satu aplikasi untuk berbagai domain | >= 60% sesi melibatkan lebih dari 1 kategori dalam 30 hari |
| G2 | Jawaban langsung ke inti | Evaluasi manual 50 sampel: tanpa basa-basi pembuka |
| G3 | Akurasi matematika dan kode | >= 90% lolos benchmark internal kecil per domain |
| G4 | Format mudah dibaca | Markdown, LaTeX, dan code block render tanpa error |

## 4. Target Pengguna

| Persona | Deskripsi | Kebutuhan Utama |
|---------|-----------|-----------------|
| Developer / Mahasiswa IT | Menulis dan debug kode | Kode siap pakai, penjelasan bug ringkas |
| Pelajar / Mahasiswa sains | Menyelesaikan soal matematika dan sains | Langkah demi langkah, rumus LaTeX |
| Analis data pemula | Mengolah dan membaca data | Penjelasan analisis jelas, contoh kode |
| Penulis / Kreator konten | Menulis cerita, caption, artikel | Gaya fleksibel, hasil siap pakai |

## 5. Ruang Lingkup

### 5.1 In Scope (MVP)

- Chat dengan AI secara streaming di browser.
- Render Markdown, code block dengan syntax highlighting dan tombol salin, serta LaTeX (`$...$` dan `$$...$$`).
- Riwayat chat tersimpan di browser (IndexedDB), dapat dibuka dan dihapus.
- Pilihan model AI (Claude, OpenAI, DeepSeek, Llama) dari daftar yang dikonfigurasi server.
- Tombol stop, dan regenerate jawaban terakhir.
- Bahasa UI: Bahasa Indonesia.

### 5.2 Out of Scope (MVP)

- Akun pengguna dan sinkronisasi riwayat antar perangkat.
- Input API key oleh pengguna (BYOK). API key dikelola server.
- Upload file dan analisis dokumen besar (fase 2).
- Eksekusi kode di dalam aplikasi (fase 2).
- Mode suara dan aplikasi native mobile.

## 6. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
|----|-----------|-----------|
| FR-01 | Pengguna mengirim pesan teks dan menerima jawaban streaming | Must |
| FR-02 | Markdown tampil benar (bold, list, tabel, heading) | Must |
| FR-03 | Rumus LaTeX inline (`$...$`) dan blok (`$$...$$`) dirender | Must |
| FR-04 | Code block menampilkan label bahasa dan tombol salin | Must |
| FR-05 | Riwayat chat tersimpan di browser dan bisa dibuka kembali | Must |
| FR-06 | Pengguna membuat dan menghapus chat | Must |
| FR-07 | Pengguna memilih model AI dari daftar yang tersedia | Must |
| FR-08 | Pengguna menghentikan streaming di tengah jalan | Should |
| FR-09 | Pengguna regenerate jawaban terakhir | Should |
| FR-10 | Pengguna mengganti tema terang/gelap | Could |
| FR-11 | Pengguna mengekspor chat ke Markdown | Could |

## 7. Kebutuhan Non-Fungsional

| ID | Kategori | Kebutuhan |
|----|----------|-----------|
| NFR-01 | Performa | Token pertama muncul < 2 detik pada koneksi stabil (di luar latensi provider) |
| NFR-02 | Keamanan | API key hanya ada di server (environment variable); tidak pernah dikirim ke browser atau dicatat ke log |
| NFR-03 | Keamanan | Sanitasi output Markdown; HTML mentah tidak dirender |
| NFR-04 | Privasi | Riwayat chat hanya di browser pengguna; server tidak menyimpan percakapan |

## 8. Aturan Perilaku AI (Ringkas)

Perilaku AI mengikuti `SYSTEM_PROMPT.md`:

- Bahasa mengikuti bahasa pengguna (default Bahasa Indonesia santai).
- Langsung ke inti jawaban, tanpa basa-basi pembuka atau penutup berulang.
- Koding: kode clean, modern, siap pakai.
- Matematika: langkah demi langkah, rumus memakai LaTeX.
- Ambigu: pakai asumsi terbaik, tulis asumsinya, lalu jawab.

## 9. Metrik Keberhasilan

- Retensi: 30% pengguna aktif kembali dalam 7 hari.
- Kepuasan: rating jawaban (jempol atas/bawah) >= 75% positif.
- Stabilitas: error rate request chat < 1%.
- Render: 0 error fatal pada render LaTeX dan Markdown di uji regresi.

## 10. Asumsi & Risiko

| No | Asumsi / Risiko | Mitigasi |
|----|-----------------|----------|
| A1 | Operator (pemilik aplikasi) menyediakan API key provider | Konfigurasi via environment variable; dokumentasi di README |
| A2 | Provider menyediakan API streaming | Abstraksi provider via Vercel AI SDK |
| R1 | Akurasi matematika dan kode tidak selalu 100% | Disclaimer singkat; anjurkan verifikasi untuk kasus kritis |
| R2 | Biaya token membengkak | Rate limit, batas panjang konteks, pilihan model ekonomis |
| R3 | Penyalahgunaan kuota API | Rate limit per IP; validasi input di server |
| R4 | Riwayat hilang jika browser data dihapus | Fitur ekspor chat (fase 2) |

## 11. Roadmap Singkat

| Fase | Fitur |
|------|-------|
| MVP | Chat streaming, Markdown, LaTeX, code block, riwayat lokal, pilihan model, rate limit |
| Fase 2 | Akun pengguna dan sinkronisasi, upload file (CSV/PDF), ekspor chat |
| Fase 3 | Eksekusi kode sandbox, mode domain (mis. Analisis Data), PWA |

## 12. Pertanyaan Terbuka

1. Model default apa yang dipakai saat aplikasi pertama dibuka?
2. Apakah perlu login sejak MVP atau cukup anonim?
3. Batasan kuota per pengguna berapa?
4. Apakah ada batasan konten di luar aturan dasar (mis. konten dewasa atau politik)?

| NFR-05 | Keamanan | Rate limit per IP pada endpoint chat untuk mencegah penyalahgunaan kuota |
| NFR-06 | Kompatibilitas | Chrome, Edge, Firefox, Safari versi terbaru; layout responsif untuk mobile |
| NFR-07 | Aksesibilitas | Kontras teks WCAG AA; fungsi utama bisa dijalankan dengan keyboard |
