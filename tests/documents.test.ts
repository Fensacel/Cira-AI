import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
  MAX_DOCUMENTS_PER_MESSAGE,
  documentToPart,
  inlineDocumentParts,
  isDocumentFilename,
} from '@/lib/document-parts';
import { validateAttachments } from '@/lib/attachments';
import {
  LEGACY_EXTENSIONS,
  columnIndexFromRef,
  sharedStringsFromXml,
  sheetTextFromXml,
  slideTextFromXml,
} from '@/lib/document-extract';

describe('isDocumentFilename', () => {
  it('menerima ekstensi dokumen yang didukung', () => {
    expect(isDocumentFilename('laporan.PDF')).toBe(true);
    expect(isDocumentFilename('tugas.docx')).toBe(true);
    expect(isDocumentFilename('slide.pptx')).toBe(true);
    expect(isDocumentFilename('catatan.md')).toBe(true);
  });

  it('menolak format lama dan tidak dikenal', () => {
    expect(isDocumentFilename('lama.doc')).toBe(false);
    expect(isDocumentFilename('lama.ppt')).toBe(false);
    expect(isDocumentFilename('tanpa-ekstensi')).toBe(false);
  });

  it('menandai .doc, .ppt, dan .xls lama sebagai legacy', () => {
    expect(LEGACY_EXTENSIONS).toEqual(['doc', 'ppt', 'xls']);
  });
});

describe('documentToPart dan inlineDocumentParts', () => {
  it('mengubah dokumen menjadi text part dengan nama file', () => {
    const part = documentToPart('catatan.txt', 'halo\ndunia & salam');
    const [message] = inlineDocumentParts([
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'ringkas' }, part] } as UIMessage,
    ]);
    expect(message.parts).toEqual([
      { type: 'text', text: 'ringkas' },
      { type: 'text', text: 'Isi dokumen "catatan.txt":\n\nhalo\ndunia & salam' },
    ]);
  });

  it('tidak mengubah gambar', () => {
    const image = { type: 'file' as const, mediaType: 'image/png', url: 'data:image/png;base64,iVBORw0KGgo=' };
    const [message] = inlineDocumentParts([{ id: 'u2', role: 'user', parts: [image] } as UIMessage]);
    expect(message.parts).toEqual([image]);
  });
});

describe('validateAttachments untuk dokumen', () => {
  it('menolak dokumen melebihi batas per pesan', () => {
    const parts = Array.from({ length: MAX_DOCUMENTS_PER_MESSAGE + 1 }, (_, i) =>
      documentToPart(`doc${i}.txt`, 'isi'),
    );
    const error = validateAttachments([{ id: 'u3', role: 'user', parts } as UIMessage]);
    expect(error).toBe(`Maksimal ${MAX_DOCUMENTS_PER_MESSAGE} dokumen per pesan.`);
  });

  it('menerima dokumen teks yang valid', () => {
    const parts = [documentToPart('a.txt', 'isi')];
    expect(validateAttachments([{ id: 'u4', role: 'user', parts } as UIMessage])).toBeNull();
  });

  it('menolak URL dokumen yang bukan data URL teks', () => {
    const parts = [{ type: 'file' as const, mediaType: 'text/plain', url: 'https://example.com/a.txt' }];
    const error = validateAttachments([{ id: 'u5', role: 'user', parts } as UIMessage]);
    expect(error).toBe('Dokumen tidak valid atau terlalu panjang.');
  });
});

describe('XLSX', () => {
  it('menerima ekstensi xlsx dan menolak xls lama', () => {
    expect(isDocumentFilename('data.xlsx')).toBe(true);
    expect(isDocumentFilename('data.XLSX')).toBe(true);
    expect(LEGACY_EXTENSIONS).toContain('xls');
  });

  it('mengonversi referensi kolom ke indeks', () => {
    expect(columnIndexFromRef('A1')).toBe(0);
    expect(columnIndexFromRef('Z9')).toBe(25);
    expect(columnIndexFromRef('AA3')).toBe(26);
    expect(columnIndexFromRef('AB12')).toBe(27);
  });

  it('membaca shared strings termasuk rich text dan entity', () => {
    const xml =
      '<sst><si><t>Nama</t></si><si><r><t>Ha</t></r><r><t>lo &amp; dunia</t></r></si></sst>';
    expect(sharedStringsFromXml(xml)).toEqual(['Nama', 'Halo & dunia']);
  });

  it('mengubah sel menjadi TSV dengan kolom sejajar', () => {
    const shared = ['Nama', 'Budi'];
    const xml =
      '<worksheet><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Nilai</t></is></c></row>' +
      '<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"/><c r="C2"><v>87.5</v></c></row>' +
      '<row r="3"><c r="A3" t="b"><v>1</v></c><c r="C3" t="str"><f>A2</f><v>a&amp;b</v></c></row>' +
      '<row r="4"><c r="A4"/></row>' +
      '</sheetData></worksheet>';
    expect(sheetTextFromXml(xml, shared)).toBe('Nama\t\tNilai\nBudi\t\t87.5\n1\t\ta&b');
  });
});

describe('slideTextFromXml', () => {
  it('mengambil teks per paragraf dan men-decode entity XML', () => {
    const xml =
      '<p:sld><a:p><a:r><a:t>Judul </a:t></a:r><a:r><a:t>&amp; Tujuan</a:t></a:r></a:p>' +
      '<a:p><a:endParaRPr/></a:p><a:p><a:r><a:t>Poin &#8212; satu</a:t></a:r></a:p></p:sld>';
    expect(slideTextFromXml(xml)).toBe('Judul & Tujuan\nPoin — satu');
  });
});
