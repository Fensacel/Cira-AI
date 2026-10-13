import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import PptxGenJS from 'pptxgenjs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { EXPORT_DIR } from './excel';

export const MAX_DOC_BLOCKS = 300;
export const MAX_TABLE_ROWS = 200;
export const MAX_SLIDES = 30;
export const MAX_BULLETS_PER_SLIDE = 8;

export const docBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('heading'),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).describe('Tingkat heading 1 sampai 3'),
    text: z.string().min(1).max(500),
  }),
  z.object({ type: z.literal('paragraph'), text: z.string().min(1).max(5000) }),
  z.object({ type: z.literal('bullet'), text: z.string().min(1).max(1000) }),
  z.object({
    type: z.literal('table'),
    headers: z.array(z.string().max(200)).min(1).max(12),
    rows: z.array(z.array(z.string().max(500)).max(12)).max(MAX_TABLE_ROWS),
  }),
]);

export const slideSchema = z.object({
  title: z.string().min(1).max(200).describe('Judul slide'),
  bullets: z.array(z.string().min(1).max(200)).max(MAX_BULLETS_PER_SLIDE).describe('Poin slide'),
});

export type DocBlock = z.infer<typeof docBlockSchema>;
export type Slide = z.infer<typeof slideSchema>;

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3] as const;

function buildTable(headers: string[], rows: string[][]): Table {
  const cell = (text: string, bold = false) =>
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold })] })] });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((header) => cell(header, true)) }),
      ...rows.map((row) => new TableRow({ children: headers.map((_, i) => cell(row[i] ?? '')) })),
    ],
  });
}

/** Bangun file .docx di memori. Tidak menulis ke disk, sehingga bisa dites. */
export async function buildDocxBuffer(title: string | undefined, blocks: DocBlock[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  if (title) children.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE }));
  for (const block of blocks) {
    if (block.type === 'heading') {
      children.push(new Paragraph({ text: block.text, heading: HEADINGS[block.level - 1] }));
    } else if (block.type === 'paragraph') {
      children.push(new Paragraph({ text: block.text }));
    } else if (block.type === 'bullet') {
      children.push(new Paragraph({ text: block.text, bullet: { level: 0 } }));
    } else {
      children.push(buildTable(block.headers, block.rows));
    }
  }
  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

/** Bangun file .pptx (16:9) di memori. Setiap slide berisi judul dan poin. */
export async function buildPptxBuffer(slides: Slide[]): Promise<Buffer> {
  const pptx = new PptxGenJS();
  for (const slide of slides) {
    const page = pptx.addSlide();
    page.addText(slide.title, { x: 0.5, y: 0.3, w: 9, h: 0.9, fontSize: 30, bold: true, color: '1F2937' });
    if (slide.bullets.length > 0) {
      page.addText(
        slide.bullets.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
        { x: 0.5, y: 1.4, w: 9, h: 3.9, fontSize: 18, color: '374151', valign: 'top' },
      );
    }
  }
  const data = await pptx.write({ outputType: 'nodebuffer' });
  if (!Buffer.isBuffer(data)) throw new Error('Gagal membuat file PPTX.');
  return data;
}

async function saveExport(fileName: string, extension: 'docx' | 'pptx', data: Buffer): Promise<string> {
  await mkdir(EXPORT_DIR, { recursive: true });
  const filePath = path.join(EXPORT_DIR, `${fileName}.${extension}`);
  await writeFile(filePath, data);
  return filePath;
}

export async function writeDocx(fileName: string, title: string | undefined, blocks: DocBlock[]): Promise<string> {
  return saveExport(fileName, 'docx', await buildDocxBuffer(title, blocks));
}

export async function writePptx(fileName: string, slides: Slide[]): Promise<string> {
  return saveExport(fileName, 'pptx', await buildPptxBuffer(slides));
}
