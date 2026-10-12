'use client';

import { useEffect, useRef, useState } from 'react';
import { getFileExtension } from '@/lib/document-parts';

type DocumentPreviewProps = {
  file: File;
  onClose: () => void;
};

/**
 * Preview dokumen di browser. PDF memakai iframe bawaan browser. DOCX dan PPTX dirender
 * oleh library client-side. Library di-import dinamis agar tidak dimuat di server.
 */
export function DocumentPreview({ file, onClose }: DocumentPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ext = getFileExtension(file.name);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    async function load() {
      try {
        if (ext === 'pdf') {
          const url = URL.createObjectURL(file);
          if (!active) {
            URL.revokeObjectURL(url);
            return;
          }
          setPdfUrl(url);
          cleanup = () => URL.revokeObjectURL(url);
        } else if (ext === 'docx') {
          const container = containerRef.current;
          if (!container) return;
          const { renderAsync } = await import('docx-preview');
          container.innerHTML = '';
          await renderAsync(file, container, undefined, { inWrapper: true, ignoreWidth: false });
        } else if (ext === 'pptx') {
          const container = containerRef.current;
          if (!container) return;
          const { init } = await import('pptx-preview');
          const buffer = await file.arrayBuffer();
          if (!active) return;
          container.innerHTML = '';
          const previewer = init(container, { mode: 'list', width: container.clientWidth || 960 });
          cleanup = () => previewer.destroy();
          await previewer.preview(buffer);
        } else {
          throw new Error('Format ini belum bisa di-preview.');
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal menampilkan dokumen.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      cleanup?.();
    };
  }, [file, ext]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${file.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface-container-low shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">description</span>
            <span className="truncate text-[13px] font-medium text-on-surface">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup preview"
            className="rounded-md px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            Tutup
          </button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto bg-surface-container">
          {loading && !error && <p className="p-4 text-[13px] text-outline">Memuat preview...</p>}
          {error && <p className="p-4 text-[13px] text-danger">{error}</p>}
          {ext === 'pdf' && pdfUrl && (
            <iframe src={pdfUrl} title={file.name} className="h-full min-h-[70vh] w-full border-0" />
          )}
          <div ref={containerRef} className={ext === 'pdf' ? 'hidden' : 'h-full'} />
        </div>
      </div>
    </div>
  );
}
