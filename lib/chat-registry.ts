'use client';

import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport, type FileUIPart, type UIMessage } from 'ai';
import { DEFAULT_CHAT_TITLE } from './chat-title';
import { getChat, saveChat, setChatTitle } from './db';

/**
 * Registry sesi chat di level modul. Instance Chat hidup di luar React, jadi stream tetap jalan
 * walau ChatView di-unmount (pindah chat atau chat baru). Simpan dan judul dilakukan di onFinish.
 */
const sessions = new Map<string, Chat<UIMessage>>();
const modelIds = new Map<string, string>();
const titleRequested = new Set<string>();
const listeners = new Set<() => void>();

const transport = new DefaultChatTransport({ api: '/api/chat' });

/** Dipanggil setiap kali data chat berubah (simpan atau judul baru). Dipakai sidebar. */
export function onChatChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyChange(): void {
  listeners.forEach((listener) => listener());
}

function getMessageText(message: UIMessage): string {
  return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
}

async function requestTitle(chatId: string, messages: UIMessage[]): Promise<void> {
  if (titleRequested.has(chatId)) return;
  const firstUser = messages.find((message) => message.role === 'user');
  const firstAssistant = messages.find((message) => message.role === 'assistant');
  const userText = firstUser ? getMessageText(firstUser).trim() : '';
  const assistantText = firstAssistant ? getMessageText(firstAssistant).trim() : '';
  if (!userText || !assistantText) return;

  const saved = await getChat(chatId);
  if (!saved || saved.title !== DEFAULT_CHAT_TITLE) return;

  titleRequested.add(chatId);
  try {
    const res = await fetch('/api/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userText, assistantText }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { title: string | null };
    if (!data.title) return;
    await setChatTitle(chatId, data.title);
    notifyChange();
  } catch {
    // Judul gagal tidak mengganggu chat. Chat tetap memakai judul default.
  }
}

async function persist(chatId: string, messages: UIMessage[]): Promise<void> {
  await saveChat({ id: chatId, modelId: modelIds.get(chatId) ?? '', messages });
  notifyChange();
  await requestTitle(chatId, messages);
}

/** Ambil sesi chat yang sudah ada, atau buat baru dengan riwayat awal dari IndexedDB. */
export function getChatSession(chatId: string, initialMessages: UIMessage[]): Chat<UIMessage> {
  const existing = sessions.get(chatId);
  if (existing) return existing;

  const chat = new Chat<UIMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    onFinish: ({ messages }) => {
      void persist(chatId, messages);
    },
  });
  sessions.set(chatId, chat);
  return chat;
}

/** Kirim pesan ke sesi chat. Model dicatat untuk disimpan saat stream selesai. */
export function sendChatMessage(
  chatId: string,
  input: { text: string; files: FileUIPart[] },
  modelId: string,
): Promise<void> {
  const chat = sessions.get(chatId);
  if (!chat) throw new Error('Sesi chat belum dibuat.');
  modelIds.set(chatId, modelId);
  return chat.sendMessage({ text: input.text, files: input.files }, { body: { modelId } });
}

/** Ulangi jawaban terakhir. Model dikirim ulang agar server tidak menolak request atau memakai model lama. */
export function regenerateChatMessage(chatId: string, modelId: string): Promise<void> {
  const chat = sessions.get(chatId);
  if (!chat) throw new Error('Sesi chat belum dibuat.');
  modelIds.set(chatId, modelId);
  return chat.regenerate({ body: { modelId } });
}

/** Hentikan dan lepas sesi, dipakai saat chat dihapus. */
export function discardChatSession(chatId: string): void {
  void sessions.get(chatId)?.stop();
  sessions.delete(chatId);
  modelIds.delete(chatId);
  titleRequested.delete(chatId);
}
