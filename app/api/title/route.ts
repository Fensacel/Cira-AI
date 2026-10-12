import { streamText } from 'ai';
import { z } from 'zod';
import { getNineRouterProvider } from '@/lib/providers';
import { checkRateLimit } from '@/lib/rate-limit';
import { TITLE_SYSTEM_PROMPT, buildTitlePrompt, sanitizeTitle } from '@/lib/chat-title';
import { getTitleModelCandidates } from '@/lib/title-models';

export const runtime = 'nodejs';
export const maxDuration = 30;

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

const requestSchema = z.object({
  userText: z.string().min(1).max(8000),
  assistantText: z.string().min(1).max(8000),
});

function getClientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anonymous';
}

/** Membuat judul chat dari isi percakapan. Mengembalikan title null jika gagal, client tetap memakai judul default. */
export async function POST(req: Request): Promise<Response> {
  const limit = checkRateLimit(getClientKey(req), RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return Response.json({ title: null }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'Payload tidak valid.' }, { status: 400 });
  }

  const { userText, assistantText } = parsed.data;
  const provider = getNineRouterProvider();

  // Coba kandidat berurutan dan berhenti di judul pertama yang valid. Client hanya memanggil sekali.
  for (const modelId of getTitleModelCandidates()) {
    try {
      const result = streamText({
        model: provider(modelId),
        system: TITLE_SYSTEM_PROMPT,
        prompt: buildTitlePrompt(userText, assistantText),
        maxOutputTokens: 40,
      });
      // Memakai streamText, bukan generateText: 9router membalas non-stream dengan format yang tidak kompatibel.
      const title = sanitizeTitle(await result.text);
      if (title) return Response.json({ title });
      console.warn('[api/title] judul kosong dari', modelId);
    } catch (error) {
      console.error('[api/title] gagal dengan', modelId, error);
    }
  }
  return Response.json({ title: null });
}
