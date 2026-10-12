import { streamText, type UIMessage } from 'ai';
import { buildExtractionPrompt, parseExtraction } from './memory';
import { getNineRouterProvider } from './providers';
import { getMemoryStore } from './memory-store';

const MAX_EXCHANGE_CHARS = 2000;

const EXTRACTION_SYSTEM = `Tugasmu mengekstrak fakta jangka panjang tentang pengguna dari satu pertukaran chat.
Fokus pada: nama, bahasa atau gaya yang disukai, profesi atau peran, proyek dan topik yang sedang digarap, serta preferensi yang diungkapkan.
Abaikan: pertanyaan sekali pakai, isi gambar, dan hal yang hanya relevan untuk jawaban ini.
Jangan menyimpan data sensitif seperti password, nomor kartu, atau alamat rumah.
Jangan mengulang fakta yang sudah tersimpan.
Balas HANYA dengan JSON array berisi string, maksimal 3 item, tiap item satu kalimat singkat berbahasa Indonesia. Jika tidak ada fakta baru, balas [].`;

export async function getMemoryTexts(ownerId: string): Promise<string[]> {
  try {
    const items = await getMemoryStore().list(ownerId);
    return items.map((item) => item.content);
  } catch (error) {
    console.error('[memory] gagal membaca memori', error);
    return [];
  }
}

function lastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((message) => message.role === 'user');
  if (!last) return '';
  return last.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join(' ')
    .trim();
}

/** Dipanggil setelah jawaban selesai. Menyimpan fakta baru dari pertukaran terakhir. */
export async function extractMemories(input: {
  ownerId: string;
  modelId: string;
  messages: UIMessage[];
  assistantText: string;
}): Promise<number> {
  const userText = lastUserText(input.messages);
  if (!userText || !input.assistantText.trim()) return 0;

  const store = getMemoryStore();
  const existing = (await store.list(input.ownerId)).map((item) => item.content);
  // Memakai streamText (bukan generateText): 9router membalas non-stream dengan
  // JSON diikuti "data: [DONE]" sehingga parser JSON non-stream gagal.
  const result = streamText({
    model: getNineRouterProvider()(input.modelId),
    system: EXTRACTION_SYSTEM,
    prompt: buildExtractionPrompt(
      existing,
      userText.slice(0, MAX_EXCHANGE_CHARS),
      input.assistantText.slice(0, MAX_EXCHANGE_CHARS),
    ),
    maxOutputTokens: 300,
  });
  const text = await result.text;

  return store.add(input.ownerId, parseExtraction(text));
}
