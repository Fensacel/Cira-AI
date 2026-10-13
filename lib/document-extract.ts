import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { MAX_DOCUMENT_CHARS, getFileExtension, type ExtractResult } from './document-parts';

/** Error yang aman ditampilkan ke pengguna. */
export class DocumentError extends Error {}

const SLIDE_PATH = /^ppt\/slides\/slide(\d+)\.xml$/;
const SHEET_PATH = /^xl\/worksheets\/sheet(\d+)\.xml$/;

/** Format Office biner lama. Tidak didukung karena butuh parser terpisah. */
export const LEGACY_EXTENSIONS = ['doc', 'ppt', 'xls'];
export const LEGACY_MESSAGE =
  'Format .doc, .ppt, dan .xls lama belum didukung. Simpan ulang sebagai .docx, .pptx, atau .xlsx.';

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (match, code: string) => {
    if (code.startsWith('#x')) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return XML_ENTITIES[code] ?? match;
  });
}

/** Mengambil teks dari XML slide PowerPoint. Setiap paragraf DrawingML (<a:p>) menjadi satu baris. */
export function slideTextFromXml(xml: string): string {
  const paragraphs = xml.match(/<a:p[ >][\s\S]*?<\/a:p>/g) ?? [];
  return paragraphs
    .map((paragraph) =>
      Array.from(paragraph.matchAll(/<a:t>([^<]*)<\/a:t>/g), (match) => decodeXmlEntities(match[1])).join(''),
    )
    .filter((line) => line.length > 0)
    .join('\n');
}

/** Mengubah referensi kolom Excel (mis. "AB12") menjadi indeks kolom nol-based. */
export function columnIndexFromRef(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? '';
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

/** Mengambil daftar string bersama (shared strings). Setiap <si> bisa punya beberapa <t> (rich text). */
export function sharedStringsFromXml(xml: string): string[] {
  return Array.from(xml.matchAll(/<si>([\s\S]*?)<\/si>/g), (match) =>
    decodeXmlEntities(Array.from(match[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g), (t) => t[1]).join('')),
  );
}

/**
 * Mengubah XML sheet menjadi baris TSV. Sel kosong di tengah dibiarkan sebagai kolom kosong
 * agar posisi kolom tetap sejajar. Baris kosong seluruhnya dibuang.
 */
export function sheetTextFromXml(xml: string, sharedStrings: string[]): string {
  const rows: string[] = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2] ?? '';
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const index = ref ? columnIndexFromRef(ref) : cells.length;
      while (cells.length < index) cells.push('');

      let value = '';
      if (type === 's') {
        const raw = /<v>(\d+)<\/v>/.exec(body)?.[1];
        value = raw === undefined ? '' : (sharedStrings[Number(raw)] ?? '');
      } else if (type === 'inlineStr') {
        value = decodeXmlEntities(Array.from(body.matchAll(/<t[^>]*>([^<]*)<\/t>/g), (t) => t[1]).join(''));
      } else {
        const raw = /<v>([^<]*)<\/v>/.exec(body)?.[1];
        value = raw === undefined ? '' : type === 'str' ? decodeXmlEntities(raw) : raw;
      }
      cells[index] = value.replace(/[\t\r\n]+/g, ' ');
    }
    if (cells.some((cell) => cell.length > 0)) rows.push(cells.join('\t'));
  }
  return rows.join('\n');
}

async function extractXlsxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const sharedStrings = sharedXml ? sharedStringsFromXml(sharedXml) : [];

  const sheets = Object.keys(zip.files)
    .map((name) => ({ name, order: Number(SHEET_PATH.exec(name)?.[1]) }))
    .filter((sheet) => Number.isFinite(sheet.order))
    .sort((a, b) => a.order - b.order);

  const sections: string[] = [];
  for (const [index, sheet] of sheets.entries()) {
    const xml = await zip.file(sheet.name)?.async('string');
    if (!xml) continue;
    const body = sheetTextFromXml(xml, sharedStrings);
    sections.push(`--- Sheet ${index + 1} ---\n${body}`);
  }
  return sections.join('\n\n');
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slides = Object.keys(zip.files)
    .map((name) => ({ name, order: Number(SLIDE_PATH.exec(name)?.[1]) }))
    .filter((slide) => Number.isFinite(slide.order))
    .sort((a, b) => a.order - b.order);

  const sections: string[] = [];
  for (const [index, slide] of slides.entries()) {
    const xml = await zip.file(slide.name)?.async('string');
    if (!xml) continue;
    sections.push(`--- Slide ${index + 1} ---\n${slideTextFromXml(xml)}`);
  }
  return sections.join('\n\n');
}

/**
 * Mengubah isi file .ipynb (JSON) menjadi teks. Sel kode dan markdown diberi label dan urutan dipertahankan.
 * Output sel (hasil eksekusi) tidak disertakan agar konteks tidak membengkak.
 */
export function notebookTextFromJson(json: string): string {
  let notebook: unknown;
  try {
    notebook = JSON.parse(json);
  } catch {
    throw new DocumentError('File notebook (.ipynb) tidak valid.');
  }
  const cells = (notebook as { cells?: unknown })?.cells;
  if (!Array.isArray(cells)) {
    throw new DocumentError('File notebook (.ipynb) tidak valid.');
  }

  const sections: string[] = [];
  for (const [index, cell] of cells.entries()) {
    const type = (cell as { cell_type?: unknown })?.cell_type;
    const source = (cell as { source?: unknown })?.source;
    const body = Array.isArray(source)
      ? source.filter((line): line is string => typeof line === 'string').join('')
      : typeof source === 'string'
        ? source
        : '';
    if (!body.trim()) continue;
    const label = type === 'code' ? 'Kode' : type === 'markdown' ? 'Markdown' : 'Sel';
    sections.push(`--- ${label} ${index + 1} ---\n${body}`);
  }
  return sections.join('\n\n');
}

async function extractRawText(file: File): Promise<string> {
  const ext = getFileExtension(file.name);
  const buffer = await file.arrayBuffer();

  switch (ext) {
    case 'pdf':
      return extractPdfText(buffer);
    case 'docx':
      return (await mammoth.extractRawText({ buffer: Buffer.from(buffer) })).value;
    case 'pptx':
      return extractPptxText(buffer);
    case 'xlsx':
      return extractXlsxText(buffer);
    case 'ipynb':
      return notebookTextFromJson(new TextDecoder('utf-8').decode(buffer));
    case 'txt':
    case 'md':
    case 'csv':
    case 'py':
      return new TextDecoder('utf-8').decode(buffer);
    default:
      throw new DocumentError('Format dokumen tidak didukung.');
  }
}

/** Mengekstrak teks dari dokumen. Format ditentukan dari ekstensi, bukan MIME dari browser. */
export async function extractDocumentText(file: File): Promise<ExtractResult> {
  let raw: string;
  try {
    raw = await extractRawText(file);
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError('File tidak bisa dibaca. Pastikan file tidak rusak atau terproteksi password.');
  }

  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) {
    throw new DocumentError('Tidak ada teks yang bisa dibaca dari dokumen ini (mungkin hasil scan tanpa OCR).');
  }

  const truncated = text.length > MAX_DOCUMENT_CHARS;
  return {
    text: truncated ? text.slice(0, MAX_DOCUMENT_CHARS) : text,
    truncated,
  };
}
