'use client';

import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';

type CodeBlockProps = {
  code: string;
  language: string;
};

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    codeToHtml(code, { lang: language, theme: 'github-dark' })
      .then((result) => {
        if (active) setHtml(result);
      })
      .catch(() => {
        // Bahasa tidak dikenal: tampilkan teks biasa
        if (active) setHtml(null);
      });
    return () => {
      active = false;
    };
  }, [code, language]);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-4 flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-md">
      <div className="flex items-center justify-between bg-surface-container-high px-4 py-2.5 text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-danger/70" />
          <span className="h-3 w-3 rounded-full bg-warning/50" />
          <span className="h-3 w-3 rounded-full bg-success/70" />
          <span className="ml-2 font-mono text-xs font-medium text-on-surface">{language}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-highest"
        >
          <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
          <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
        </button>
      </div>
      {html ? (
        <div
          className="overflow-x-auto font-mono text-[13px] leading-[1.55] [&_pre]:bg-surface-container-lowest [&_pre]:p-4 sm:[&_pre]:p-5"
          // Output shiki sudah meng-escape isi kode; sumber hanya dari jawaban model.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto bg-surface-container-lowest p-4 font-mono text-[13px] leading-[1.55] text-on-surface sm:p-5">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
