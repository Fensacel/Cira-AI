import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type MemoryItem = {
  id: string;
  content: string;
  createdAt: number;
};

export type MemoryStore = {
  list(ownerId: string): Promise<MemoryItem[]>;
  /** Menambah fakta baru. Mengembalikan jumlah yang benar-benar tersimpan. */
  add(ownerId: string, contents: string[]): Promise<number>;
  /** Menghapus satu memori milik owner. Mengembalikan true jika ada yang terhapus. */
  remove(ownerId: string, id: string): Promise<boolean>;
};

/** Operasi penyimpanan mentah. Dipisah agar aturan dedupe dan batas bisa diuji tanpa Supabase. */
export type MemoryRepository = {
  list(ownerId: string): Promise<MemoryItem[]>;
  insert(row: { id: string; ownerId: string; content: string }): Promise<void>;
  delete(ownerId: string, id: string): Promise<boolean>;
};

export const MAX_MEMORIES_PER_OWNER = 50;
export const MAX_MEMORY_CHARS = 300;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, MAX_MEMORY_CHARS);
}

export function createMemoryStore(repo: MemoryRepository): MemoryStore {
  return {
    list: (ownerId) => repo.list(ownerId),

    async add(ownerId, contents) {
      const current = await repo.list(ownerId);
      const existing = new Set(current.map((item) => item.content.toLowerCase()));
      let count = current.length;
      let added = 0;
      for (const raw of contents) {
        const content = normalizeContent(raw);
        if (!content || existing.has(content.toLowerCase())) continue;
        if (count >= MAX_MEMORIES_PER_OWNER) break;
        await repo.insert({ id: randomUUID(), ownerId, content });
        existing.add(content.toLowerCase());
        count += 1;
        added += 1;
      }
      return added;
    },

    remove: (ownerId, id) => repo.delete(ownerId, id),
  };
}

type MemoryRow = { id: string; content: string; created_at: string };

function createSupabaseRepository(client: SupabaseClient): MemoryRepository {
  return {
    async list(ownerId) {
      const { data, error } = await client
        .from('memories')
        .select('id, content, created_at')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(`Gagal membaca memori: ${error.message}`);
      return ((data ?? []) as MemoryRow[]).map((row) => ({
        id: row.id,
        content: row.content,
        createdAt: Date.parse(row.created_at),
      }));
    },

    async insert({ id, ownerId, content }) {
      const { error } = await client
        .from('memories')
        .insert({ id, owner_id: ownerId, content });
      if (error) throw new Error(`Gagal menyimpan memori: ${error.message}`);
    },

    async delete(ownerId, id) {
      // id bukan UUID tidak mungkin ada di tabel. Dicek dulu agar Postgres tidak error.
      if (!UUID_PATTERN.test(id)) return false;
      const { data, error } = await client
        .from('memories')
        .delete()
        .eq('owner_id', ownerId)
        .eq('id', id)
        .select('id');
      if (error) throw new Error(`Gagal menghapus memori: ${error.message}`);
      return (data ?? []).length > 0;
    },
  };
}

const globalForMemory = globalThis as typeof globalThis & { __ciraMemory?: MemoryStore };

/** Singleton per proses. Disimpan di globalThis agar tidak membuat client berulang saat hot reload dev. */
export function getMemoryStore(): MemoryStore {
  if (!globalForMemory.__ciraMemory) {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !serviceRoleKey) {
      throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diatur di environment server.');
    }
    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    globalForMemory.__ciraMemory = createMemoryStore(createSupabaseRepository(client));
  }
  return globalForMemory.__ciraMemory;
}
