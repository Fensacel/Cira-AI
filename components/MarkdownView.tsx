import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { linkCitations, parseCitationHref, resolveLinkHref } from '@/lib/citations';
import { CodeBlock } from './CodeBlock';

type MarkdownViewProps = {
  content: string;
};

/** Chip sumber seperti referensi di Gemini: nama sumber pertama dan jumlah sisanya. */
function CitationChip({ names }: { names: string[] }) {
  const [first, ...rest] = names;
  return (
    <span
      title={names.join(', ')}
      className="mx-0.5 inline-flex max-w-[260px] translate-y-[-1px] items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 align-middle text-[12px] font-medium text-on-surface-variant"
    >
      <span className="material-symbols-outlined text-[14px]">description</span>
      <span className="truncate">{first}</span>
      {rest.length > 0 && <span className="shrink-0 text-outline">+{rest.length}</span>}
    </span>
  );
}

const components: Components = {
  pre({ children }) {
    // Blok kode fenced: render lewat CodeBlock (highlight + tombol salin)
    if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) {
      return <pre>{children}</pre>;
    }
    const language = /language-(\w+)/.exec(children.props.className ?? '')?.[1] ?? 'text';
    const code = String(children.props.children ?? '').replace(/\n$/, '');
    return <CodeBlock code={code} language={language} />;
  },
  code({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) {
    // Hanya kode inline; blok kode ditangani di `pre`
    return (
      <code
        className={`rounded bg-surface-container px-1.5 py-0.5 font-mono text-[13px] text-on-surface ${className ?? ''}`}
        {...props}
      >
        {children}
      </code>
    );
  },
  a({ href, children }) {
    const citations = parseCitationHref(href ?? '');
    if (citations.length > 0) {
      return <CitationChip names={citations} />;
    }
    const externalHref = resolveLinkHref(href);
    if (!externalHref) {
      return <span className="text-on-surface">{children}</span>;
    }
    return (
      <a href={externalHref} target="_blank" rel="noopener noreferrer" className="text-on-surface underline underline-offset-2 hover:opacity-70">
        {children}
      </a>
    );
  },
  h1({ children }) {
    return <h1 className="mt-6 mb-3 text-[22px] font-semibold text-on-surface first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mt-6 mb-3 text-[19px] font-semibold text-on-surface first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mt-5 mb-2 text-[17px] font-semibold text-on-surface first:mt-0">{children}</h3>;
  },
  p({ children }) {
    return <p className="mb-3 text-[16px] leading-[1.6] text-on-surface last:mb-0">{children}</p>;
  },
  ul({ children }) {
    return <ul className="mb-3 list-disc space-y-1 pl-5 text-[15px] leading-[1.6] text-on-surface-variant">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-3 list-decimal space-y-1 pl-5 text-[15px] leading-[1.6] text-on-surface-variant">{children}</ol>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-on-surface">{children}</strong>;
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-lg bg-surface-container-lowest">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return <th className="bg-surface-container px-3 py-2 text-left font-semibold text-on-surface">{children}</th>;
  },
  td({ children }) {
    return <td className="px-3 py-2 text-on-surface-variant">{children}</td>;
  },
};

/** Render Markdown + LaTeX. Tidak memakai rehype-raw, sehingga HTML mentah tidak dirender. */
export function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <div className="max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {linkCitations(content)}
      </ReactMarkdown>
    </div>
  );
}
