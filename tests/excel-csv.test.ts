import { describe, expect, it } from 'vitest';
import { buildCsv, buildWorkbook } from '@/lib/skills/excel';


describe('buildCsv', () => {
  const sheet = {
    name: 'Data',
    columns: [
      { header: 'Nama', key: 'nama' },
      { header: 'Catatan', key: 'catatan' },
    ],
    rows: [
      { nama: 'Ani', catatan: 'halo, dunia' },
      { nama: 'Budi', catatan: '=SUM(A1:A2)' },
    ],
  };

  it('menulis header lalu baris, dengan tanda kutip untuk nilai berkoma', () => {
    expect(buildCsv(sheet)).toBe('Nama,Catatan\nAni,"halo, dunia"\nBudi,=SUM(A1:A2)');
  });

  it('tidak menambah BOM di awal teks', () => {
    expect(buildCsv(sheet).startsWith('\uFEFF')).toBe(false);
  });
});

describe('buildWorkbook', () => {
  const sheets = [
    {
      name: 'Kas',
      columns: [
        { header: 'Masuk', key: 'masuk', numFmt: 'idr' as const },
        { header: 'Keluar', key: 'keluar', numFmt: 'idr' as const },
        { header: 'Saldo', key: 'saldo', numFmt: 'idr' as const },
      ],
      rows: [
        { masuk: 1000, keluar: 0, saldo: '=SUM($A$2:A2)-SUM($B$2:B2)' },
        { masuk: 0, keluar: 250, saldo: '=SUM($A$2:A3)-SUM($B$2:B3)' },
      ],
    },
  ];

  it('menulis rumus sebagai formula, bukan angka hasil hitungan', () => {
    const sheet = buildWorkbook(sheets).getWorksheet('Kas');
    expect(sheet?.getCell('C2').value).toEqual({ formula: 'SUM($A$2:A2)-SUM($B$2:B2)' });
    expect(sheet?.getCell('C3').value).toEqual({ formula: 'SUM($A$2:A3)-SUM($B$2:B3)' });
  });

  it('meminta Excel menghitung ulang rumus saat file dibuka', () => {
    expect(buildWorkbook(sheets).calcProperties.fullCalcOnLoad).toBe(true);
  });

  it('header tebal dan baris 1 dibekukan', () => {
    const sheet = buildWorkbook(sheets).getWorksheet('Kas');
    expect(sheet?.getRow(1).font?.bold).toBe(true);
    expect(sheet?.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
  });
});
