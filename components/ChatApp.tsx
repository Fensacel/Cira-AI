'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UIMessage } from 'ai';
import { deleteChat, getChat, listChats, type ChatRecord } from '@/lib/db';
import type { ModelOption } from '@/lib/types';
import { discardChatSession, onChatChange } from '@/lib/chat-registry';
import { ChatView } from './ChatView';

function newId(): string {
  return crypto.randomUUID();
}

/** Container: daftar model, riwayat chat, dan chat yang sedang aktif. */
export function ChatApp() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelId, setModelId] = useState<string>('');
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [activeId, setActiveId] = useState<string>(newId);
  const [loaded, setLoaded] = useState<{ id: string; messages: UIMessage[]; modelId: string } | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshChats = useCallback(() => listChats().then(setChats), []);

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json() as Promise<{ models: ModelOption[] }>)
      .then((data) => {
        setModels(data.models);
        setModelId((current) => current || data.models[0]?.id || '');
      })
      .catch(() => setLoadError('Gagal memuat daftar model.'));
    listChats().then(setChats);
  }, []);

  // Sidebar ikut diperbarui saat stream chat mana pun selesai, termasuk chat yang sudah tidak aktif.
  useEffect(() => onChatChange(() => void refreshChats()), [refreshChats]);

  // Muat pesan chat aktif dari IndexedDB setiap kali berpindah chat.
  useEffect(() => {
    let active = true;
    getChat(activeId).then((record) => {
      if (!active) return;
      setLoaded({ id: activeId, messages: record?.messages ?? [], modelId: record?.modelId ?? '' });
    });
    return () => {
      active = false;
    };
  }, [activeId]);

  async function handleDelete(id: string) {
    discardChatSession(id);
    await deleteChat(id);
    if (id === activeId) {
      setActiveId(newId());
    }
    await refreshChats();
  }

  const current = loaded?.id === activeId ? loaded : null;

  if (current === null) {
    return <div className="flex h-dvh items-center justify-center text-zinc-500">Memuat...</div>;
  }

  return (
    <ChatView
      key={activeId}
      chatId={activeId}
      initialMessages={current.messages}
      modelId={current.modelId || modelId}
      models={models}
      chats={chats}
      loadError={loadError}
      onModelChange={setModelId}
      onSelectChat={(id) => {
        setActiveId(id);
      }}
      onNewChat={() => {
        setActiveId(newId());
      }}
      onDeleteChat={handleDelete}
    />
  );
}
