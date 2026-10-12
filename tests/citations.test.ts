import { describe, expect, it } from 'vitest';
import { CITE_PREFIX, linkCitations, parseCitationHref } from '@/lib/citations';

describe('linkCitations', () => {
  it('mengubah penanda tunggal menjadi link cite', () => {
    const out = linkCitations('Tarif dihitung progresif [[UU HPP No. 7/2021]].');
    expect(out.startsWith('Tarif dihitung progresif [UU HPP No. 7/2021](cite:')).toBe(true);
    expect(parseCitationHref(out.match(/\((cite:[^)]+)\)/)![1])).toEqual(['UU HPP No. 7/2021']);
  });

  it('menggabungkan penanda berurutan dan membuang duplikat', () => {
    const out = linkCitations('Klaim [[A]] [[B]] [[A]].');
    const href = out.match(/\((cite:[^)]+)\)/)![1];
    expect(out).toContain('[A](');
    expect(parseCitationHref(href)).toEqual(['A', 'B']);
  });

  it('membiarkan teks tanpa penanda', () => {
    expect(linkCitations('Halo dunia')).toBe('Halo dunia');
  });

  it('melewati blok kode dan kode inline', () => {
    const code = 'pakai `arr[[1]]` lalu:\n```python\nx = a[[1]]\n```\nsumber [[UU HPP]]';
    const out = linkCitations(code);
    expect(out).toContain('`arr[[1]]`');
    expect(out).toContain('x = a[[1]]');
    expect(out).toContain('[UU HPP](cite:');
  });

  it('membiarkan penanda kosong', () => {
    expect(linkCitations('x [[  ]] y')).toBe('x [[  ]] y');
  });
});

describe('parseCitationHref', () => {
  it('mengembalikan kosong untuk href biasa atau rusak', () => {
    expect(parseCitationHref('https://example.com')).toEqual([]);
    expect(parseCitationHref(`${CITE_PREFIX}%%%`)).toEqual([]);
    expect(parseCitationHref(`${CITE_PREFIX}${encodeURIComponent('{"a":1}')}`)).toEqual([]);
  });
});
