import { describe, expect, it } from 'vitest';
import { notebookTextFromJson } from '@/lib/document-extract';
import { isDocumentFilename } from '@/lib/document-parts';

describe('format py dan ipynb', () => {
  it('menerima ekstensi py dan ipynb', () => {
    expect(isDocumentFilename('solver.py')).toBe(true);
    expect(isDocumentFilename('Analisis.IPYNB')).toBe(true);
  });

  it('mengambil sel kode dan markdown dengan urutan dan label', () => {
    const json = JSON.stringify({
      cells: [
        { cell_type: 'markdown', source: ['# Judul\n', 'Penjelasan'] },
        { cell_type: 'code', source: 'print(1)', outputs: [{ text: ['JANGAN'] }] },
        { cell_type: 'code', source: ['   '] },
      ],
    });
    const text = notebookTextFromJson(json);
    expect(text).toBe('--- Markdown 1 ---\n# Judul\nPenjelasan\n\n--- Kode 2 ---\nprint(1)');
    expect(text).not.toContain('JANGAN');
  });

  it('melempar error jelas untuk JSON rusak atau tanpa cells', () => {
    expect(() => notebookTextFromJson('{rusak')).toThrow('File notebook (.ipynb) tidak valid.');
    expect(() => notebookTextFromJson('{"foo":1}')).toThrow('File notebook (.ipynb) tidak valid.');
  });
});
