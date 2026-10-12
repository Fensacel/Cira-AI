import { useEffect, useMemo, useState } from 'react';
import type { ChatRecord } from '@/lib/db';

type ChatSidebarProps = {
  activeId: string;
  chats: ChatRecord[];
  modelLabel: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => Promise<void>;
  open: boolean;
  onClose: () => void;
};

type ChatGroup = { label: string; items: ChatRecord[] };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Kelompokkan chat: Hari ini, Kemarin, 7 Hari Terakhir, Lebih Lama. Urutan input dipertahankan. */
export function groupChats(chats: ChatRecord[], now: number = Date.now()): ChatGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();

  const groups: ChatGroup[] = [
    { label: 'Hari ini', items: [] },
    { label: 'Kemarin', items: [] },
    { label: '7 Hari Terakhir', items: [] },
    { label: 'Lebih Lama', items: [] },
  ];

  for (const chat of chats) {
    if (chat.updatedAt >= today) groups[0].items.push(chat);
    else if (chat.updatedAt >= today - DAY_MS) groups[1].items.push(chat);
    else if (chat.updatedAt >= today - 7 * DAY_MS) groups[2].items.push(chat);
    else groups[3].items.push(chat);
  }

  return groups.filter((group) => group.items.length > 0);
}
export function ChatSidebar({
  activeId,
  chats,
  modelLabel,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  open,
  onClose,
}: ChatSidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const visibleChats = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!searchOpen || keyword === '') return chats;
    return chats.filter((chat) => chat.title.toLowerCase().includes(keyword));
  }, [chats, query, searchOpen]);
  const groups = groupChats(visibleChats);

  // Pintasan Ctrl/⌘ + N untuk chat baru. Browser tertentu mungkin tetap membuka jendela baru.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n' && !event.shiftKey) {
        event.preventDefault();
        onNewChat();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewChat]);

  return (
    <>
      {open && <div onClick={onClose} aria-hidden="true" className="fixed inset-0 z-40 bg-black/40 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface-container-low px-3 py-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="flex items-center gap-2.5 px-3 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cira-icon.png" alt="" aria-hidden="true" width={28} height={28} className="h-7 w-7 shrink-0" />
        <span className="font-display text-lg font-semibold tracking-tight text-on-surface">Cira AI</span>
      </div>

      <nav className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-full bg-surface-container-high px-3 py-2.5 text-left text-[14px] font-medium text-on-surface transition-colors hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined text-[20px]">edit_square</span>
          <span>Percakapan baru</span>
        </button>
        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          aria-pressed={searchOpen}
          className={`flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left text-[14px] transition-colors hover:bg-surface-container ${
            searchOpen ? 'text-on-surface' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
          <span>Telusuri percakapan</span>
        </button>
        {searchOpen && (
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari judul chat..."
            aria-label="Cari judul chat"
            className="mx-3 mb-1 rounded-lg bg-surface-container-lowest px-3 py-2 text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        )}
      </nav>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {groups.length === 0 && (
          <p className="px-3 text-[13px] text-on-surface-variant">
            {chats.length === 0 ? 'Belum ada riwayat chat.' : 'Tidak ada chat yang cocok.'}
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5 pb-3">
            <span className="px-3 pb-1.5 pt-2 text-[12px] font-medium text-on-surface-variant">
              {group.label === 'Hari ini' ? 'Terbaru' : group.label}
            </span>
            {group.items.map((item) => {
              const active = item.id === activeId;
              return (
                <div
                  key={item.id}
                  className={`group flex items-center justify-between gap-1 rounded-full px-3 py-2 transition-colors ${
                    active
                      ? 'bg-surface-container-high text-on-surface'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectChat(item.id);
                      onClose();
                    }}
                    className={`min-w-0 flex-1 truncate text-left text-[14px] ${active ? 'font-medium' : ''}`}
                  >
                    {item.title}
                  </button>
                  <button
                    type="button"
                    aria-label="Hapus chat"
                    onClick={() => void onDeleteChat(item.id)}
                    className="hidden shrink-0 rounded p-0.5 text-outline hover:text-danger group-hover:block"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-on-surface-variant">
        <span className="truncate text-[13px] font-medium text-on-surface">{modelLabel}</span>
        <span className="font-mono text-[11px]">Active</span>
      </div>
    </aside>
    </>
  );
}

