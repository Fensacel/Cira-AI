import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { z } from 'zod';
import { isAllowedModel } from '@/lib/models';
import { AUTO_MODEL_ID, getUserTexts, resolveAutoModel } from '@/lib/auto-route';
import { getNineRouterProvider } from '@/lib/providers';
import { checkRateLimit } from '@/lib/rate-limit';
import { SYSTEM_PROMPT } from '@/lib/prompts/system';
import type { ChatMetadata } from '@/lib/types';
import { validateAttachments } from '@/lib/attachments';
import { inlineDocumentParts } from '@/lib/document-parts';
import { getOwner, withOwnerCookie } from '@/lib/owner';
import { buildSystemPrompt } from '@/lib/memory';
import { extractMemories, getMemoryTexts } from '@/lib/memory-service';
import { skillTools } from '@/lib/skills';

const MAX_TOOL_STEPS = 5;

export const runtime = 'nodejs';
export const maxDuration = 60;

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_CHARS = 12_000_000;
const MAX_MESSAGES = 60;

const requestSchema = z.object({
  messages: z
    .array(z.custom<UIMessage>((value) => typeof value === 'object' && value !== null))
    .min(1)
    .max(MAX_MESSAGES),
  modelId: z.string().min(1).max(200),
});

function getClientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anonymous';
}

export async function POST(req: Request): Promise<Response> {
  const limit = checkRateLimit(getClientKey(req), RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return Response.json(
      { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) {
    return Response.json({ error: 'Payload terlalu besar.' }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    console.warn('[api/chat] 400 schema', parsed.error.issues.slice(0, 5));
    return Response.json({ error: 'Payload tidak valid.' }, { status: 400 });
  }

  const { messages, modelId: requestedModelId } = parsed.data;
  if (requestedModelId !== AUTO_MODEL_ID && !isAllowedModel(requestedModelId)) {
    console.warn('[api/chat] 400 model', requestedModelId);
    return Response.json({ error: 'Model tidak tersedia.' }, { status: 400 });
  }

  const attachmentError = validateAttachments(messages);
  if (attachmentError) {
    console.warn('[api/chat] 400 attachment', attachmentError);
    return Response.json({ error: attachmentError }, { status: 400 });
  }

  let modelId = requestedModelId;
  if (requestedModelId === AUTO_MODEL_ID) {
    const routed = resolveAutoModel(getUserTexts(messages));
    modelId = routed.modelId;
    console.info(`[api/chat] auto -> ${modelId} (${routed.category})`);
  }

  const owner = getOwner(req);

  try {
    const provider = getNineRouterProvider();
    const startedAt = Date.now();
    const memories = getMemoryTexts(owner.id);
    const result = streamText({
      model: provider(modelId),
      system: buildSystemPrompt(SYSTEM_PROMPT, memories),
      messages: await convertToModelMessages(inlineDocumentParts(messages)),
      tools: skillTools,
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      abortSignal: req.signal,
      onFinish: async ({ text }) => {
        try {
          const added = await extractMemories({
            ownerId: owner.id,
            modelId,
            messages,
            assistantText: text,
          });
          if (added > 0) console.info(`[memory] +${added} untuk owner`);
        } catch (error) {
          console.error('[memory] ekstraksi gagal', error);
        }
      },
    });

    const response = result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error('[api/chat] stream error', error);
        return 'Gagal memproses permintaan.';
      },
      messageMetadata: ({ part }) => {
        if (part.type !== 'finish') return undefined;
        const outputTokens = part.totalUsage.outputTokens;
        const seconds = (Date.now() - startedAt) / 1000;
        const metadata: ChatMetadata = { modelId, outputTokens };
        if (outputTokens !== undefined && seconds > 0) {
          metadata.tokensPerSecond = Number((outputTokens / seconds).toFixed(1));
        }
        return metadata;
      },
    });
    return withOwnerCookie(response, owner);
  } catch (error) {
    console.error('[api/chat]', error);
    return Response.json({ error: 'Gagal memproses permintaan.' }, { status: 500 });
  }
}
