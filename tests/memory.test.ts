import { describe, expect, it } from 'vitest';
import {
  createMemoryStore,
  MAX_MEMORIES_PER_OWNER,
  MAX_MEMORY_CHARS,
  type MemoryItem,
  type MemoryRepository,
} from '@/lib/memory-store';
import { buildSystemPrompt, parseExtraction, MAX_NEW_MEMORIES_PER_TURN } from '@/lib/memory';
import { getOwner, OWNER_COOKIE } from '@/lib/owner';

/** Repositori in-memory untuk test. Meniru perilaku tabel memories di Supabase. */
function createFakeRepository(): MemoryRepository {
  const rows: (MemoryItem & { ownerId: string })[] = [];
  return {
    async list(ownerId) {
      return rows
        .filter((row) => row.ownerId === ownerId)
        .map(({ id, content, createdAt }) => ({ id, content, createdAt }));
    },
    async insert({ id, ownerId, content }) {
      rows.push({ id, ownerId, content, createdAt: Date.now() });
    },
    async delete(ownerId, id) {
      const index = rows.findIndex((row) => row.ownerId === ownerId && row.id === id);
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    },
  };
}

describe('memory store', () => {
  it('menyimpan, dedupe, dan memisahkan per owner', async () => {
    const store = createMemoryStore(createFakeRepository());
    expect(await store.add('owner-a', ['Nama user: Budi', 'nama user: budi', '  '])).toBe(1);
    expect(await store.add('owner-b', ['Nama user: Sari'])).toBe(1);
    expect((await store.list('owner-a')).map((m) => m.content)).toEqual(['Nama user: Budi']);
    expect((await store.list('owner-b')).map((m) => m.content)).toEqual(['Nama user: Sari']);
  });

  it('memotong teks panjang dan membatasi jumlah per owner', async () => {
    const store = createMemoryStore(createFakeRepository());
    const long = 'x'.repeat(MAX_MEMORY_CHARS + 50);
    await store.add('owner-a', [long]);
    expect((await store.list('owner-a'))[0].content.length).toBe(MAX_MEMORY_CHARS);

    const many = Array.from({ length: MAX_MEMORIES_PER_OWNER + 10 }, (_, i) => `fakta ${i}`);
    expect(await store.add('owner-a', many)).toBe(MAX_MEMORIES_PER_OWNER - 1);
    expect(await store.list('owner-a')).toHaveLength(MAX_MEMORIES_PER_OWNER);
  });

  it('hanya menghapus memori milik owner yang sama', async () => {
    const store = createMemoryStore(createFakeRepository());
    await store.add('owner-a', ['fakta A']);
    const [item] = await store.list('owner-a');
    expect(await store.remove('owner-b', item.id)).toBe(false);
    expect(await store.remove('owner-a', item.id)).toBe(true);
    expect(await store.list('owner-a')).toEqual([]);
  });
});

describe('memory prompt dan parser', () => {
  it('tanpa memori mengembalikan base prompt apa adanya', () => {
    expect(buildSystemPrompt('BASE', [])).toBe('BASE');
  });

  it('menyisipkan memori ke system prompt', () => {
    const prompt = buildSystemPrompt('BASE', ['Nama user: Budi']);
    expect(prompt).toContain('BASE');
    expect(prompt).toContain('[MEMORI PENGGUNA]');
    expect(prompt).toContain('- Nama user: Budi');
  });

  it('parse JSON array dari output model, termasuk yang dibungkus teks', () => {
    expect(parseExtraction('["Nama user: Budi"]')).toEqual(['Nama user: Budi']);
    expect(parseExtraction('Hasil: ["satu", "dua"] selesai')).toEqual(['satu', 'dua']);
  });

  it('output tidak valid menghasilkan array kosong', () => {
    expect(parseExtraction('bukan json')).toEqual([]);
    expect(parseExtraction('[broken')).toEqual([]);
    expect(parseExtraction('{"a":1}')).toEqual([]);
  });

  it('membatasi jumlah fakta baru per giliran dan membuang item non-string', () => {
    const items = Array.from({ length: 10 }, (_, i) => `f${i}`);
    expect(parseExtraction(JSON.stringify([1, ...items]))).toHaveLength(MAX_NEW_MEMORIES_PER_TURN);
  });
});

describe('getOwner', () => {
  it('membuat owner baru jika cookie tidak ada', () => {
    const owner = getOwner(new Request('http://localhost/api/memories'));
    expect(owner.isNew).toBe(true);
    expect(owner.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('memakai ulang cookie yang valid', () => {
    const id = crypto.randomUUID();
    const req = new Request('http://localhost/api/memories', {
      headers: { cookie: `other=1; ${OWNER_COOKIE}=${id}` },
    });
    expect(getOwner(req)).toEqual({ id, isNew: false });
  });

  it('menolak cookie yang bukan UUID', () => {
    const req = new Request('http://localhost/api/memories', {
      headers: { cookie: `${OWNER_COOKIE}=../../etc` },
    });
    expect(getOwner(req).isNew).toBe(true);
  });
});
