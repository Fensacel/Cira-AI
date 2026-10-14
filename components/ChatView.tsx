'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useChat } from '@ai-sdk/react';
import type { FileUIPart, UIMessage } from 'ai';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES_PER_MESSAGE, imageFileToPart } from '@/lib/attachments';
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_MEDIA_TYPE,
  MAX_DOCUMENTS_PER_MESSAGE,
  isDocumentPart,
  uploadDocument,
} from '@/lib/document-parts';
import { canPreviewDocument, getDocumentFile, rememberDocumentFile } from '@/lib/document-files';
import type { ChatRecord } from '@/lib/db';
import { getChatSession, regenerateChatMessage, sendChatMessage } from '@/lib/chat-registry';
import type { ChatMetadata, ModelOption } from '@/lib/types';
import { ChatSidebar } from './ChatSidebar';
import { CodeBlock } from './CodeBlock';
import { MarkdownView } from './MarkdownView';
import { DocumentPreview } from './DocumentPreview';
import { MemoryPanel } from './MemoryPanel';

type ChatViewProps = {
  chatId: string;
  initialMessages: UIMessage[];
  modelId: string;
  models: ModelOption[];
  chats: ChatRecord[];
  loadError: string | null;
  onModelChange: (id: string) => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => Promise<void>;
};

function getMessageText(message: UIMessage): string {
  return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
}

type ExportLink = { name: string; href: string };

type InlineArtifact = { name: string; language: string; content: string };

/** Tool yang menghasilkan file biner di folder exports dan diunduh lewat link. */
const EXPORT_TOOL_PART_TYPES = new Set<string>([
  'tool-exportExcelTool',
  'tool-createDocxTool',
  'tool-createPptxTool',
]);

/** Tool yang mengembalikan isi teks (kode atau CSV) untuk ditampilkan di chat. */
const INLINE_TOOL_PART_TYPES = new Set<string>(['tool-exportCsvTool', 'tool-createArduinoSketchTool']);

type ExportToolPart = Extract<UIMessage['parts'][number], { state: string; output?: unknown }>;

function isExportToolPart(part: UIMessage['parts'][number]): part is ExportToolPart {
  return EXPORT_TOOL_PART_TYPES.has(part.type);
}

/** Ambil link unduhan dari hasil tool ekspor yang sukses. Nama file diambil dari basename path server. */
function getExportLinks(message: UIMessage): ExportLink[] {
  const links: ExportLink[] = [];
  for (const part of message.parts) {
    if (!isExportToolPart(part)) {
      continue;
    }
    if (part.state !== 'output-available') continue;
    const output = part.output as { success?: boolean; filePath?: string } | undefined;
    if (!output?.success || !output.filePath) continue;
    const name = output.filePath.split(/[\\/]/).pop() ?? '';
    if (!name) continue;
    links.push({ name, href: `/api/exports/${encodeURIComponent(name)}` });
  }
  return links;
}

function isInlineToolPart(part: UIMessage['parts'][number]): part is ExportToolPart {
  return INLINE_TOOL_PART_TYPES.has(part.type);
}

/** Ambil isi kode/CSV dari hasil tool yang sukses untuk ditampilkan di chat. */
function getInlineArtifacts(message: UIMessage): InlineArtifact[] {
  const artifacts: InlineArtifact[] = [];
  for (const part of message.parts) {
    if (!isInlineToolPart(part)) continue;
    if (part.state !== 'output-available') continue;
    const output = part.output as { success?: boolean; fileName?: string; code?: string; csv?: string } | undefined;
    if (!output?.success || !output.fileName) continue;
    if (part.type === 'tool-createArduinoSketchTool' && output.code) {
      artifacts.push({ name: output.fileName, language: 'cpp', content: output.code });
    } else if (part.type === 'tool-exportCsvTool' && output.csv) {
      artifacts.push({ name: output.fileName, language: 'csv', content: output.csv });
    }
  }
  return artifacts;
}

function InlineArtifacts({ message }: { message: UIMessage }) {
  const artifacts = getInlineArtifacts(message);
  if (artifacts.length === 0) return null;
  return (
    <div className="flex flex-col">
      {artifacts.map((artifact, index) => (
        <div key={`${artifact.name}-${index}`}>
          <p className="mt-3 font-mono text-[13px] text-on-surface-variant">{artifact.name}</p>
          <CodeBlock code={artifact.content} language={artifact.language} />
        </div>
      ))}
    </div>
  );
}

function ExportLinks({ message }: { message: UIMessage }) {
  const links = getExportLinks(message);
  if (links.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => (
        <div key={link.href} className="flex w-full flex-col gap-2">
          <a
            href={link.href}
            download={link.name}
            className="flex w-fit items-center gap-2 rounded-xl bg-surface-container-high px-3 py-2 text-[13px] text-on-surface transition-colors hover:bg-surface-bright"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span className="font-mono">{link.name}</span>
          </a>
        </div>
      ))}
    </div>
  );
}

function getMessageMetadata(message: UIMessage): ChatMetadata | undefined {
  const metadata = message.metadata;
  return typeof metadata === 'object' && metadata !== null ? (metadata as ChatMetadata) : undefined;
}

function UserImages({ message }: { message: UIMessage }) {
  const images = message.parts.filter(
    (part): part is FileUIPart => part.type === 'file' && part.mediaType.startsWith('image/'),
  );
  if (images.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {images.map((image, index) => (
        // Data URL dari browser; next/image tidak mendukung sumber ini.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${message.id}-${index}`}
          src={image.url}
          alt={image.filename ?? 'Lampiran gambar'}
          className="max-h-64 rounded-lg object-contain"
        />
      ))}
    </div>
  );
}

function UserDocuments({
  message,
  onPreview,
}: {
  message: UIMessage;
  onPreview: (filename: string) => void;
}) {
  const documents = message.parts.filter(isDocumentPart);
  if (documents.length === 0) return null;
  return (
    <ul className="mb-2 flex flex-wrap gap-2">
      {documents.map((document, index) => {
        const filename = document.filename ?? 'Dokumen';
        const previewable = document.filename !== undefined && canPreviewDocument(filename);
        const cached = previewable && getDocumentFile(filename) !== undefined;
        return (
          <li
            key={`${message.id}-doc-${index}`}
            className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-1.5 text-[12px] text-on-surface"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">description</span>
            <span className="max-w-56 truncate">{filename}</span>
            {cached && (
              <button
                type="button"
                onClick={() => onPreview(filename)}
                aria-label={`Preview ${filename}`}
                className="text-outline transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TokenStats({ metadata }: { metadata: ChatMetadata | undefined }) {
  if (metadata?.tokensPerSecond === undefined) return null;
  const chips = [`${metadata.tokensPerSecond} token/detik`];
  if (metadata.outputTokens !== undefined) chips.push(`${metadata.outputTokens} token output`);
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip} className="rounded-md bg-surface-container px-2 py-1 font-mono text-[11px] text-on-surface-variant">
          {chip}
        </span>
      ))}
    </div>
  );
}

/** Tampilan satu chat. Di-remount lewat key saat chatId berubah. */
export function ChatView({
  chatId,
  initialMessages,
  modelId,
  models,
  chats,
  loadError,
  onModelChange,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(modelId);
  const [attachments, setAttachments] = useState<FileUIPart[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [previewFilename, setPreviewFilename] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  // true selama pengguna berada di dekat bawah. Jika pengguna scroll ke atas, auto-scroll berhenti.
  const stickToBottomRef = useRef(true);

  // Sesi disimpan di registry, bukan di komponen. Pindah chat tidak menghentikan stream yang berjalan.
  const { messages, status, stop, error, clearError } = useChat({
    chat: getChatSession(chatId, initialMessages),
  });

  const busy = status === 'submitted' || status === 'streaming';

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // Ikut turun saat pesan atau isi streaming berubah, selama pengguna masih di dekat bawah.
  useEffect(() => {
    if (stickToBottomRef.current) scrollToBottom();
  }, [messages, status]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 120;
  }
  // Saat /api/models belum selesai, selectedModel masih kosong. Pakai model pertama agar request tidak mengirim modelId kosong.
  const activeModel = selectedModel || models[0]?.id || '';
  const modelLabel = models.find((model) => model.id === activeModel)?.label ?? activeModel;

  // Daftar chat terbaru untuk dicek di efek berikutnya tanpa memasukkannya ke dependency (hindari loop simpan).
  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await addFiles(files);
  }

  async function addFiles(files: File[]) {
    if (files.length === 0) return;

    setAttachError(null);
    // Kuota gambar dan dokumen dihitung terpisah. Dokumen tidak ikut dibatasi MAX_IMAGES_PER_MESSAGE.
    let images = attachments.filter((part) => !isDocumentPart(part)).length;
    let documents = attachments.length - images;
    let imageLimitHit = false;
    let documentLimitHit = false;

    setProcessing(true);
    const added: FileUIPart[] = [];
    try {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          if (images >= MAX_IMAGES_PER_MESSAGE) {
            imageLimitHit = true;
            continue;
          }
          added.push(await imageFileToPart(file));
          images += 1;
          continue;
        }
        if (documents >= MAX_DOCUMENTS_PER_MESSAGE) {
          documentLimitHit = true;
          continue;
        }
        const part = await uploadDocument(file);
        rememberDocumentFile(file.name, file);
        added.push(part);
        documents += 1;
      }
      if (imageLimitHit) {
        setAttachError(`Maksimal ${MAX_IMAGES_PER_MESSAGE} gambar per pesan.`);
      } else if (documentLimitHit) {
        setAttachError(`Maksimal ${MAX_DOCUMENTS_PER_MESSAGE} dokumen per pesan.`);
      }
    } catch (error) {
      setAttachError(error instanceof Error ? error.message : 'Gagal memproses lampiran.');
    } finally {
      setAttachments((current) => [...current, ...added]);
      setProcessing(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((current) => current.filter((_, i) => i !== index));
  }

  function handleDragOver(event: DragEvent<HTMLFormElement>) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLFormElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy || processing) return;
    void addFiles(Array.from(event.dataTransfer.files));
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    // Sebagian browser (mis. screenshot dari Snipping Tool) hanya mengisi items, bukan files.
    const images = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (images.length === 0 || busy || processing) return;
    event.preventDefault();
    void addFiles(images);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if ((!text && attachments.length === 0) || busy || processing || !activeModel) return;
    clearError();
    setAttachError(null);
    const files = attachments;
    setInput('');
    setAttachments([]);
    // Saat kirim, pengguna selalu dibawa ke bawah.
    stickToBottomRef.current = true;
    void sendChatMessage(chatId, { text, files }, activeModel);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleModelChange(id: string) {
    setSelectedModel(id);
    onModelChange(id);
  }

  const isEmpty = messages.length === 0 && !showMemory;

  return (
    <div className="flex h-dvh bg-surface-container-lowest">
      <ChatSidebar
        activeId={chatId}
        chats={chats}
        modelLabel={modelLabel}
        onSelectChat={onSelectChat}
        onNewChat={onNewChat}
        onDeleteChat={onDeleteChat}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col md:pl-72">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 bg-surface/80 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container md:hidden"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            {loadError && <span className="truncate text-xs text-danger">{loadError}</span>}
          </div>
          <button
            type="button"
            onClick={() => setShowMemory((current) => !current)}
            aria-pressed={showMemory}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              showMemory
                ? 'bg-primary-subtle text-primary'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">psychology</span>
            <span>Memori</span>
          </button>
        </header>

        <main ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 left-1/2 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary-container/10 blur-[140px]" />
          </div>

          <div
            className="relative mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 pt-6 pb-56 md:px-6"
          >
            {showMemory && <MemoryPanel onClose={() => setShowMemory(false)} />}

            {messages.map((message) => {
              const text = getMessageText(message);

              if (message.role === 'user') {
                return (
                  <div key={message.id} className="flex flex-col items-end gap-2">
                    <div className="max-w-[80%] rounded-3xl bg-surface-container-high px-5 py-3 text-[16px] leading-[1.6] text-on-surface">
                      <UserImages message={message} />
                      <UserDocuments message={message} onPreview={setPreviewFilename} />
                      <p className="whitespace-pre-wrap break-words">{text}</p>
                    </div>
                  </div>
                );
              }

              const answeredModelId = getMessageMetadata(message)?.modelId;
              const answeredLabel = answeredModelId
                ? (models.find((model) => model.id === answeredModelId)?.label ?? answeredModelId)
                : modelLabel;

              return (
                <div key={message.id} className="flex flex-col gap-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold text-on-surface">{answeredLabel}</span>
                  </div>
                  <div className="max-w-[80%] text-[16px] leading-[1.6] text-on-surface">
                    <MarkdownView content={text} />
                    <InlineArtifacts message={message} />
                    <ExportLinks message={message} />
                    <TokenStats metadata={getMessageMetadata(message)} />
                  </div>
                </div>
              );
            })}

            {status === 'submitted' && <p className="text-sm text-outline">Cira AI sedang berpikir...</p>}

            {error && (
              <div className="rounded-xl bg-error-container/30 px-4 py-3 text-sm text-error">
                Terjadi kesalahan. Coba lagi.
                <button type="button" onClick={() => void regenerateChatMessage(chatId, activeModel)} className="ml-3 underline">
                  Ulangi
                </button>
              </div>
            )}
          </div>
        </main>

        <div
          className={`pointer-events-none fixed inset-x-0 z-30 md:left-72 flex flex-col items-center px-4 md:px-8 ${
            isEmpty
              ? 'top-16 bottom-0 justify-center gap-6 pb-4'
              : 'bottom-0 bg-gradient-to-t from-surface via-surface/90 to-transparent pt-6 pb-4'
          }`}
        >
          {isEmpty && (
            <div className="pointer-events-auto flex w-full max-w-4xl flex-col items-center text-center">
              <h1 className="font-display text-[28px] leading-tight font-semibold tracking-tight text-on-surface md:text-[32px]">
                Ada yang bisa Cira AI bantu hari ini?
              </h1>
              <p className="mt-2 text-[15px] text-on-surface-variant">
                Tanya apa saja, atau lampirkan foto dan dokumen.
              </p>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`pointer-events-auto flex w-full max-w-4xl flex-col gap-2 rounded-2xl bg-surface-container/95 p-3 shadow-2xl backdrop-blur-2xl transition-all duration-300 focus-within:shadow-[0_0_36px_-6px_rgba(128,131,255,0.22)] ${dragging ? 'ring-2 ring-primary' : ''}`}
          >
            {attachError && <p className="px-2 text-xs text-danger">{attachError}</p>}
            {dragging && <p className="px-2 text-xs text-primary">Lepas file atau gambar untuk melampirkan.</p>}
            {attachments.length > 0 && (
              <ul className="flex flex-wrap gap-2 px-2 pt-1">
                {attachments.map((file, index) => (
                  <li key={`${file.filename ?? 'gambar'}-${index}`} className="relative">
                    {file.mediaType === DOCUMENT_MEDIA_TYPE ? (
                      <div className="flex h-16 max-w-44 items-center gap-2 rounded-lg bg-surface-container-high px-3 text-[12px] text-on-surface">
                        <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                        <span className="truncate">{file.filename ?? 'Dokumen'}</span>
                        {file.filename && canPreviewDocument(file.filename) && getDocumentFile(file.filename) && (
                          <button
                            type="button"
                            onClick={() => setPreviewFilename(file.filename ?? null)}
                            aria-label={`Preview ${file.filename}`}
                            className="shrink-0 text-outline transition-colors hover:text-primary"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Data URL dari browser; next/image tidak mendukung sumber ini. */
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={file.url}
                        alt={file.filename ?? 'Lampiran gambar'}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      aria-label="Hapus lampiran"
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-container-highest text-xs text-on-surface hover:bg-surface-bright"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="px-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                rows={2}
                placeholder="Tanyakan apa saja, ketik arsitektur kode, atau lampirkan dokumen..."
                className="max-h-48 w-full resize-none bg-transparent pt-1 font-sans text-[15px] leading-relaxed text-on-surface placeholder:text-outline focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-1"><label
                aria-label="Lampirkan foto atau dokumen"
                title="Lampirkan foto, PDF, Word, PowerPoint, atau teks"
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface ${
                  busy || processing ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {processing ? 'hourglass_top' : 'attach_file'}
                </span>
                <input
                  type="file"
                  accept={`${ACCEPTED_IMAGE_TYPES.join(',')},${DOCUMENT_ACCEPT}`}
                  multiple
                  className="sr-only"
                  disabled={busy || processing}
                  onChange={(event) => void handleFilesSelected(event)}
                />
              </label>
              <label
                aria-label="Ambil foto dengan kamera"
                title="Ambil foto dengan kamera"
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface ${
                  busy || processing ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={busy || processing}
                  onChange={(event) => void handleFilesSelected(event)}
                />
              </label>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden font-mono text-[11px] text-outline sm:inline">
                  Enter kirim · Shift+Enter baris baru
                </span>
                <div className="relative mr-1">
                  <select
                    aria-label="Pilih model"
                    value={activeModel}
                    onChange={(event) => handleModelChange(event.target.value)}
                    disabled={busy || models.length === 0}
                    className="max-w-44 appearance-none truncate rounded-lg bg-surface-container py-1.5 pr-5 pl-2 text-[13px] font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none disabled:opacity-50"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id} className="bg-surface-container-high text-on-surface">
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-[18px] text-outline">
                    expand_more
                  </span>
                </div>
                {busy ? (
                  <button
                    type="button"
                    onClick={() => void stop()}
                    className="flex h-9 items-center gap-2 rounded-xl bg-surface-container-highest px-4 text-[13px] font-medium text-on-surface transition-colors hover:bg-surface-bright"
                  >
                    <span className="material-symbols-outlined text-[18px]">stop</span>
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={(!input.trim() && attachments.length === 0) || processing}
                    aria-label="Kirim pesan"
                    title="Kirim pesan (Enter)"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-container to-secondary text-on-primary-container shadow-md transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
                  >
                    <span className="material-symbols-outlined text-[20px] font-bold">arrow_upward</span>
                  </button>
                )}
              </div>
            </div>
          </form>
          <p className="pointer-events-auto mt-2 text-center text-[11px] text-outline">
            Cira AI dapat membuat kesalahan. Validasi hasil sebelum dipakai di produksi.
          </p>
        </div>
      </div>
      {previewFilename && getDocumentFile(previewFilename) && (
        <DocumentPreview
          key={previewFilename}
          file={getDocumentFile(previewFilename)!}
          onClose={() => setPreviewFilename(null)}
        />
      )}
    </div>
  );
}

