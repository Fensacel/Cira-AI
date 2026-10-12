import { describe, expect, it } from 'vitest';
import { classifyText, resolveAutoModel } from '@/lib/auto-route';

const ENV = { AIGWEH_MODELS: 'cc/math,cc/code,cc/acc,cc/general' };

describe('classifyText', () => {
  it('mengenali math, coding, accounting, dan general', () => {
    expect(classifyText('turunan dari x^2 dan integral $\\int x dx$')).toBe('math');
    expect(classifyText('kenapa function python ini error')).toBe('coding');
    expect(classifyText('hitung PPh 21 dan jurnal penyusutan')).toBe('accounting');
    expect(classifyText('apa kabar hari ini')).toBe('general');
  });

  it('kata dalam kata tidak dihitung, mis. "rapi" bukan "api"', () => {
    expect(classifyText('tulis paragraf yang rapi')).toBe('general');
  });
});

describe('resolveAutoModel', () => {
  it('memakai route dari AIGWEH_ROUTES', () => {
    const env = { ...ENV, AIGWEH_ROUTES: '{"math":"cc/math","coding":"cc/code","accounting":"cc/acc","general":"cc/general"}' };
    expect(resolveAutoModel(['buktikan limit sin x / x'], env)).toEqual({ modelId: 'cc/math', category: 'math' });
    expect(resolveAutoModel(['bug di React hook'], env).modelId).toBe('cc/code');
    expect(resolveAutoModel(['jurnal penyusutan aset'], env).modelId).toBe('cc/acc');
    expect(resolveAutoModel(['halo apa kabar'], env).modelId).toBe('cc/general');
  });

  it('kategori tanpa route memakai general, lalu model pertama', () => {
    expect(resolveAutoModel(['buktikan limit'], ENV).modelId).toBe('cc/math');
    const env = { ...ENV, AIGWEH_ROUTES: '{"general":"cc/general"}' };
    expect(resolveAutoModel(['buktikan limit'], env).modelId).toBe('cc/general');
  });

  it('mengabaikan route yang tidak ada di whitelist atau JSON rusak', () => {
    expect(resolveAutoModel(['buktikan limit'], { ...ENV, AIGWEH_ROUTES: '{"math":"evil/model"}' }).modelId).toBe('cc/math');
    expect(resolveAutoModel(['buktikan limit'], { ...ENV, AIGWEH_ROUTES: '{rusak' }).modelId).toBe('cc/math');
    expect(resolveAutoModel(['buktikan limit'], { ...ENV, AIGWEH_ROUTES: '["cc/code"]' }).modelId).toBe('cc/math');
  });

  it('pesan lanjutan pendek mewarisi kategori pesan sebelumnya', () => {
    expect(resolveAutoModel(['hitung PPh 21 setahun', 'lanjut'], ENV).category).toBe('accounting');
  });

  it('pesan panjang tanpa keyword tetap general', () => {
    expect(resolveAutoModel(['hitung PPh 21 setahun', 'tolong ceritakan sejarah kota Bandung secara panjang lebar'], ENV).category).toBe('general');
  });
});
