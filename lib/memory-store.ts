import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export type MemoryItem = {
  id: string;
  content: string;
  createdAt: number;
};

export type MemoryStore = {
  list(ownerId: string): MemoryItem[];
  /** Menambah fakta baru. Mengembalikan jumlah yang benar-benar tersimpan. */
  add(ownerId: string, contents: string[]): number;
  /** Menghapus satu memori milik owner. Mengembalikan true jika ada yang terhapus. */
  remove(ownerId: string, id: string): boolean;
  close(): void;
};

export const MAX_MEMORIES_PER_OWNER = 50;
export const MAX_MEMORY_CHARS = 300;

type MemoryRow = { id: string; content: string; createdAt: number };

function normalizeContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, MAX_MEMORY_CHARS);
}

/** Membuka (atau membuat) database memori. Gunakan ':memory:' untuk test. */
export function openMemoryStore(file: string): MemoryStore {
  if (file !== ':memory:') {
    mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS memories_owner ON memories (owner_id, created_at);
  `);

  const listStmt = db.prepare(
    'SELECT id, content, created_at AS createdAt FROM memories WHERE owner_id = ? ORDER BY created_at ASC',
  );
  const insertStmt = db.prepare(
    'INSERT INTO memories (id, owner_id, content, created_at) VALUES (?, ?, ?, ?)',
  );
  const deleteStmt = db.prepare('DELETE FROM memories WHERE owner_id = ? AND id = ?');

  function list(ownerId: string): MemoryItem[] {
    return listStmt.all(ownerId) as unknown as MemoryRow[];
  }

  return {
    list,

    add(ownerId, contents) {
      const existing = new Set(list(ownerId).map((item) => item.content.toLowerCase()));
      let count = list(ownerId).length;
      let added = 0;
      for (const raw of contents) {
        const content = normalizeContent(raw);
        if (!content || existing.has(content.toLowerCase())) continue;
        if (count >= MAX_MEMORIES_PER_OWNER) break;
        insertStmt.run(randomUUID(), ownerId, content, Date.now());
        existing.add(content.toLowerCase());
        count += 1;
        added += 1;
      }
      return added;
    },

    remove(ownerId, id) {
      const result = deleteStmt.run(ownerId, id);
      return Number(result.changes) > 0;
    },

    close() {
      db.close();
    },
  };
}

const globalForMemory = globalThis as typeof globalThis & { __aigwehMemory?: MemoryStore };

/** Singleton per proses. Disimpan di globalThis agar tidak terbuka berulang saat hot reload dev. */
export function getMemoryStore(): MemoryStore {
  if (!globalForMemory.__aigwehMemory) {
    const dir = process.env.AIGWEH_DATA_DIR?.trim() || path.join(process.cwd(), 'data');
    globalForMemory.__aigwehMemory = openMemoryStore(path.join(dir, 'aigweh.db'));
  }
  return globalForMemory.__aigwehMemory;
}
