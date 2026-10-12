import { describe, expect, it } from 'vitest';
import { getAllowedModels, isAllowedModel } from '@/lib/models';

describe('getAllowedModels', () => {
  it('memakai daftar default jika AIGWEH_MODELS kosong', () => {
    const models = getAllowedModels({});
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].id).toContain('/');
  });

  it('membaca daftar dari AIGWEH_MODELS', () => {
    const models = getAllowedModels({ AIGWEH_MODELS: 'cc/a, kr/b ,,glm/c' });
    expect(models.map((m) => m.id)).toEqual(['cc/a', 'kr/b', 'glm/c']);
  });
});

describe('isAllowedModel', () => {
  it('menolak model di luar whitelist', () => {
    expect(isAllowedModel('evil/model', { AIGWEH_MODELS: 'cc/a' })).toBe(false);
  });

  it('menerima model di whitelist', () => {
    expect(isAllowedModel('cc/a', { AIGWEH_MODELS: 'cc/a' })).toBe(true);
  });
});
