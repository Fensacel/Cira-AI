'use client';

import { useEffect, useState } from 'react';

type Memory = { id: string; content: string; createdAt: number };

/** Daftar fakta yang disimpan tentang pengguna. Bisa dihapus satu per satu. */
export function MemoryPanel({ onClose }: { onClose: () => void }) {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/memories')
      .then((res) => res.json() as Promise<{ memories: Memory[] }>)
      .then((data) => {
        if (active) setMemories(data.memories);
      })
      .catch(() => {
        if (active) setError('Gagal memuat memori.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function remove(id: string) {
    const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMemories((current) => current?.filter((item) => item.id !== id) ?? null);
    } else {
      setError('Gagal menghapus memori.');
    }
  }

  return (
    <section className="mx-auto mb-4 w-full max-w-4xl rounded-xl bg-surface-container-low p-4 text-[13px] shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">psychology</span>
          <h2 className="font-display text-[15px] font-semibold text-on-surface">Memori tentang kamu</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          Tutup
        </button>
      </div>
      {error && <p className="text-danger">{error}</p>}
      {memories === null && !error && <p className="text-outline">Memuat...</p>}
      {memories?.length === 0 && (
        <p className="text-outline">Belum ada memori. Cira AI menyimpan fakta penting dari chat kamu di sini.</p>
      )}
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {memories?.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-container"
          >
            <span className="text-on-surface">{item.content}</span>
            <button
              type="button"
              onClick={() => void remove(item.id)}
              aria-label="Hapus memori"
              className="shrink-0 text-outline transition-colors hover:text-danger"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
