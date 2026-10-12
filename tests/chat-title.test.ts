import { describe, expect, it } from 'vitest';
import { DEFAULT_CHAT_TITLE, MAX_TITLE_CHARS, buildTitlePrompt, sanitizeTitle } from '@/lib/chat-title';
import { getTitleModelCandidates } from '@/lib/title-models';

describe('getTitleModelCandidates', () => {
  it('memakai model pertama dari whitelist jika AIGWEH_TITLE_MODELS kosong', () => {
    expect(getTitleModelCandidates({})).toEqual(['tokenharbor/deepseek-v4.1-flash:free']);
  });

  it('memakai urutan dari AIGWEH_TITLE_MODELS dan membuang id yang tidak diizinkan dan duplikat', () => {
    const env = {
      AIGWEH_MODELS: 'a/one, a/two',
      AIGWEH_TITLE_MODELS: 'x/hack, a/two, a/one, a/two',
    };
    expect(getTitleModelCandidates(env)).toEqual(['a/two', 'a/one']);
  });
});

describe('sanitizeTitle', () => {
  it('membersihkan tanda kutip, titik, dan prefiks judul', () => {
    expect(sanitizeTitle('"Strategi Produk SaaS."')).toBe('Strategi Produk SaaS');
    expect(sanitizeTitle('Judul: Belajar Rust')).toBe('Belajar Rust');
    expect(sanitizeTitle('**Review Kode Go**')).toBe('Review Kode Go');
  });

  it('mengambil baris pertama yang tidak kosong dan merapikan spasi', () => {
    expect(sanitizeTitle('\n\n  Desain   Microservices \nPenjelasan panjang')).toBe('Desain Microservices');
  });

  it('mengembalikan null untuk keluaran kosong', () => {
    expect(sanitizeTitle('   \n  ')).toBeNull();
    expect(sanitizeTitle('""')).toBeNull();
  });

  it('memotong judul di atas batas karakter tanpa spasi di ujung', () => {
    const result = sanitizeTitle('kata '.repeat(40));
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(MAX_TITLE_CHARS);
    expect(result!.endsWith(' ')).toBe(false);
  });
});

describe('buildTitlePrompt', () => {
  it('memuat pertanyaan dan membatasi panjang jawaban', () => {
    const prompt = buildTitlePrompt('halo', 'x'.repeat(5000));
    expect(prompt).toContain('Pengguna: halo');
    expect(prompt.length).toBeLessThan(2000);
  });
});

describe('DEFAULT_CHAT_TITLE', () => {
  it('judul sementara tetap "Chat baru"', () => {
    expect(DEFAULT_CHAT_TITLE).toBe('Chat baru');
  });
});
