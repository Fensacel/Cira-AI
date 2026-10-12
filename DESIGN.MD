# Cira AI Design System Specification (DESIGN.md)

Dokumentasi sistem desain resmi untuk platform antarmuka AI Chat & Cognitive Engine **Cira AI**. Dirancang untuk memberikan pengalaman rekayasa perangkat lunak dan interaksi AI yang cepat, presisi, minim distraksi, dan estetis dengan tema gelap modern (*dark sleek architecture*).

---

## 1. Brand Identity & Filosofi Desain

* **Nama Produk**: Cira AI (AI Cognitive Engine & Chat Workspace)
* **Tone & Persona**: Intelijen, Cepat (Sub-second latency), Presisi Teknis, Modular, Developer-First.
* **Prinsip Visual**:
  1. **Content & Code as Protagonist**: Konten penalaran AI, blok kode terformat, dan topologi arsitektur menjadi fokus utama antarmuka.
  2. **Layered Obsidian Surfaces**: Kontras permukaan multi-tingkat (*elevation depth*) untuk membedakan canvas obrolan, panel sandbox, dan navigasi tanpa garis pembatas yang berlebihan.
  3. **Luminous Tech Accents**: Sentuhan aksen neon indigo (`#6366f1`) dan elektrik cyan (`#06b6d4`) yang menandakan status aktif, proses inferensi berjalan, dan metrik latensi real-time.

---

## 2. Palet Warna (Color System Tokens)

Sistem warna Cira AI mengandalkan mode gelap mutlak (*true dark & obsidian navy*) yang nyaman di mata untuk sesi interaksi intensif berjam-jam:

### 🌌 Background & Surface Layers
| Token | Nilai Hex | Penggunaan |
|---|---|---|
| `surface-container-lowest` | `#060e20` | Root app background, kanvas obrolan utama |
| `surface` / `surface-dim` | `#0b1326` | Card background default, area body utama |
| `surface-container-low` | `#131b2e` | Sidebar kiri permanen, modal backdrop, elevated card level 1 |
| `surface-container` | `#171f33` | Panel sekunder, input bar background, header |
| `surface-container-high` | `#1f2942` | Dropdown menu, active card state, preview chips |
| `surface-container-highest` | `#283350` | Hover states, tab switchers, code block backgrounds |
| `surface-bright` | `#31394d` | Card borders subtle, separator horizontal & vertical |

### ⚡ Aksara & Konten (Typography Colors)
| Token | Nilai Hex | Penggunaan |
|---|---|---|
| `text-primary` | `#f1f5f9` / `#ffffff` | Judul utama (H1-H3), teks pesan AI, prompt input |
| `text-secondary` | `#94a3b8` | Deskripsi sub-header, metadata status, token count |
| `text-tertiary` | `#64748b` | Timestamp, shortcut keyboard (`⌘N`), watermark |
| `text-disabled` | `#475569` | Elemen interaktif non-aktif |

### 🚀 Brand & Interactive Accents
| Token | Nilai Hex | Penggunaan |
|---|---|---|
| `primary` (Electric Indigo) | `#6366f1` | CTA utama (*Simpan Perubahan*, *Kirim*, *Gunakan Model*), active focus ring |
| `primary-hover` | `#4f46e5` | Interaksi kursor pada tombol primer |
| `primary-subtle` | `rgba(99, 102, 241, 0.12)` | Badge active, chip aktif (*Deep Think*), pill highlight |
| `accent-cyan` (Neural Spark) | `#06b6d4` | Indikator latensi (24ms), TTFT status, parameter metrics |
| `accent-violet` | `#8b5cf6` | Model Flagship badge (*Ultra-4*), tags spesialisasi |
| `success-green` | `#10b981` | Status operasional kluster (*Operational 99.98%*), lolos uji test |
| `warning-amber` | `#f59e0b` | Batas penggunaan kuota token (>80%) |
| `danger-rose` | `#f43f5e` | Penghapusan riwayat obrolan, revoke API key |

---

## 3. Tipografi (Typography Hierarchy)

* **Font Primer**: `Plus Jakarta Sans`, sans-serif (Google Fonts)
* **Font Monospace / Kode**: `JetBrains Mono` / `Fira Code`, monospace

### Skala Tipografi:
* **Display / Page Title**: `28px` - `32px` | Weight: `700 (Bold)` | Tracking: `-0.02em`
* **Section Heading (H2)**: `20px` - `24px` | Weight: `600 (SemiBold)` | Line Height: `1.3`
* **Card Title / Sub-section (H3)**: `16px` - `18px` | Weight: `600 (SemiBold)`
* **Body Regular**: `14px` - `15px` | Weight: `400 (Regular)` | Line Height: `1.6` (Optimal readability)
* **Small / Metadata Label**: `12px` - `13px` | Weight: `500 (Medium)`
* **Micro / Badges**: `10px` - `11px` | Weight: `600 (SemiBold)` | Tracking: `0.04em` (Uppercase)
* **Code Blocks**: `13px` | Font: Monospace | Line Height: `1.55`

---

## 4. Spacing, Grid & Radius

* **Base Unit**: `4px` / `8px` scale.
* **Padding & Margin Standar**:
  - Compact: `p-2` (`8px`), `p-3` (`12px`) untuk button dan icon triggers.
  - Cards & Containers: `p-5` (`20px`) hingga `p-6` (`24px`).
  - Screen Padding: `p-6` (`24px`) hingga `p-8` (`32px`) pada viewport desktop.
* **Border Radius**:
  - `rounded-md` (`6px`): Tag pills, micro buttons, dropdown items.
  - `rounded-lg` (`8px`): Standar input fields, code snippet blocks, secondary cards (`ROUND_EIGHT`).
  - `rounded-xl` (`12px`): Kartu modul AI, playground sandbox containers, popup dialogs.
  - `rounded-2xl` (`16px`): Floating prompt bar input container, master modal dialog.
  - `rounded-full` (`9999px`): Status dot indicators, badge pills, avatar frame.

---

## 5. Komponen Utama (Core Component Patterns)

### 1. Persistent Dashboard Shell
- **Left Sidebar (260px)**:
  - Header dengan logo bintang neural Cira AI dan nama brand.
  - Tombol *"New Chat"* berbingkai dengan shortcut trigger `⌘N`.
  - Riwayat sesi percakapan hierarkis (*Hari Ini*, *Kemarin*, *7 Hari Terakhir*).
  - Navigasi global: *Model Hub*, *Prompt Library*, *Settings*.
  - User profile badge di footer sidebar dengan status tier Pro dan indikator standby.
- **Top Bar (56px - 64px)**:
  - Status engine model aktif saat ini (*Nexus 2.5 Pro* - *128k ctx*).
  - Indikator latensi real-time (*24ms*).
  - Aksi cepat: *Export Session*, *Share*, dan profile avatar toggle.

### 2. Floating AI Prompt Bar
- Terletak mengambang di bawah kanvas percakapan obrolan dengan efek *backdrop blur* (`backdrop-blur-md`).
- Toggle chips penalaran khusus:
  - `Deep Think` (Aksen biru/indigo aktif).
  - `Web Search` (Pencarian daring real-time).
  - `Code Gen` (Mode pembentukan kode presisi).
- Model selector dropdown inline di sebelah kanan.
- Tombol kirim dengan gradien elektrik indigo dan shortcut `⌘ + ↵`.

### 3. Model Cards & Benchmark Displays
- Kartu model modular dengan header arsitektur (*Dense MoE*, *Kernel Architecture*).
- Bilah visualisasi metrik benchmark (HumanEval, MMLU) dengan progress bar berkilau cyan/indigo.
- Informasi transparan: Jendela konteks, tipe parameter, latensi P99, dan tarif per 1k token.

### 4. Interactive Code Snippet Container
- Header bar dengan tab penanda bahasa (`verifier.go`, `Rust`, `TypeScript`).
- Tombol satu klik *"Salin Kode"* dengan feedback visual instan.
- Dark theme syntax coloring (Keyword: pink/violet, Function: cyan/blue, String: emerald, Number: orange).

---

## 6. Elevasi & Efek Visual (Elevation & Effects)

* **Borders**: `1px solid rgba(255, 255, 255, 0.08)` untuk batas elemen di lingkungan gelap agar tidak terkesan kaku.
* **Glow & Luminous Shadows**:
  - Accent Glow: `box-shadow: 0 0 20px -5px rgba(99, 102, 241, 0.35)` pada tombol aksi primer dan emblem logo.
  - Cyan Latency Spark: `box-shadow: 0 0 12px -2px rgba(6, 182, 212, 0.4)` pada status node aktif.
* **Transparansi & Glassmorphism**:
  - `bg-[#0b1326]/80 backdrop-blur-md` untuk modal, popover, dan sticky bar.

---

## 7. Referensi Aset Terkait di Proyek

* **Design System Token**: `{{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}}`
* **App Icon & Favicon**: `{{DATA:IMAGE:IMAGE_5}}` (Neural AI Star Icon)
* **Apple Touch Icon**: `{{DATA:IMAGE:IMAGE_3}}` (Luminous 3D AI Cognitive Emblem)
* **Web Manifest File**: `{{DATA:DOCUMENT:DOCUMENT_4}}` (`manifest.json`)
* **Layar yang Mengimplementasikan**:
  - Sesi Obrolan Aktif: `{{DATA:SCREEN:SCREEN_12}}`
  - Model Hub: `{{DATA:SCREEN:SCREEN_10}}`
  - Prompt Library: `{{DATA:SCREEN:SCREEN_8}}`
  - Pengaturan & Preferensi: `{{DATA:SCREEN:SCREEN_6}}`
