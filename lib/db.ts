import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { UIMessage } from 'ai';
import { DEFAULT_CHAT_TITLE } from './chat-title';

export type ChatRecord = {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
};

interface AigwehDB extends DBSchema {
  chats: {
    key: string;
    value: ChatRecord;
    indexes: { updatedAt: number };
  };
}

const DB_NAME = 'aigweh';
// Naik dari 1 ke 3 karena browser sudah punya database aigweh versi 2 dari build lain.
// Versi yang lebih rendah dari yang ada di browser menyebabkan VersionError.
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<AigwehDB>> | undefined;

function getDb(): Promise<IDBPDatabase<AigwehDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AigwehDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        // Idempotent: aman dijalankan dari versi 0, 1, atau 2.
        const store = db.objectStoreNames.contains('chats')
          ? transaction.objectStore('chats')
          : db.createObjectStore('chats', { keyPath: 'id' });
        if (!store.indexNames.contains('updatedAt')) {
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

/** Daftar chat, terbaru di atas. */
export async function listChats(): Promise<ChatRecord[]> {
  const db = await getDb();
  const chats = await db.getAllFromIndex('chats', 'updatedAt');
  return chats.reverse();
}

export async function getChat(id: string): Promise<ChatRecord | undefined> {
  const db = await getDb();
  return db.get('chats', id);
}

/**
 * Simpan chat. Judul hanya diubah jika `title` diberikan (dibuat model). Selain itu judul lama dipertahankan.
 * createdAt dipertahankan.
 */
export async function saveChat(input: {
  id: string;
  modelId: string;
  messages: UIMessage[];
  title?: string;
}): Promise<void> {
  const db = await getDb();
  const existing = await db.get('chats', input.id);
  const now = Date.now();

  // updatedAt hanya naik jika isi pesan berubah. Sekadar membuka chat tidak memindahkannya ke atas.
  const unchanged = existing !== undefined && JSON.stringify(existing.messages) === JSON.stringify(input.messages);

  await db.put('chats', {
    id: input.id,
    title: input.title ?? existing?.title ?? DEFAULT_CHAT_TITLE,
    modelId: input.modelId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: unchanged ? existing.updatedAt : now,
    messages: input.messages,
  });
}

/** Ganti judul default dengan judul dari model. Judul yang sudah diubah tidak ditimpa. updatedAt tidak berubah. */
export async function setChatTitle(id: string, title: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get('chats', id);
  if (!existing || existing.title !== DEFAULT_CHAT_TITLE) return;
  await db.put('chats', { ...existing, title });
}

export async function deleteChat(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('chats', id);
}
