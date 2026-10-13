import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildDocxBuffer, buildPptxBuffer } from '@/lib/skills/office';

describe('buildDocxBuffer', () => {
  it('menghasilkan paket .docx yang valid dengan isi dokumen', async () => {
    const buffer = await buildDocxBuffer('Laporan Uji', [
      { type: 'heading', level: 1, text: 'Ringkasan' },
      { type: 'paragraph', text: 'Isi paragraf.' },
      { type: 'bullet', text: 'Poin satu' },
      { type: 'table', headers: ['Item', 'Nilai'], rows: [['Sewa', 'Rp 1.000.000']] },
    ]);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Laporan Uji');
    expect(xml).toContain('Isi paragraf.');
    expect(xml).toContain('Rp 1.000.000');
  });

  it('menerima dokumen tanpa judul', async () => {
    const buffer = await buildDocxBuffer(undefined, [{ type: 'paragraph', text: 'Halo' }]);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });
});

describe('buildPptxBuffer', () => {
  it('menghasilkan paket .pptx dengan satu file slide per slide', async () => {
    const buffer = await buildPptxBuffer([
      { title: 'Judul', bullets: ['Poin A', 'Poin B'] },
      { title: 'Penutup', bullets: [] },
    ]);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    const zip = await JSZip.loadAsync(buffer);
    const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slides).toHaveLength(2);
    const first = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(first).toContain('Judul');
    expect(first).toContain('Poin A');
  });
});
