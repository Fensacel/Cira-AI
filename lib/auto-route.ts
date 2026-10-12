import type { UIMessage } from 'ai';
import { getAllowedModels, type EnvLike } from './models';
import type { ModelOption } from './types';

/** Nilai modelId khusus: server memilih model konkret dari pesan user. */
export const AUTO_MODEL_ID = 'auto';

export const AUTO_MODEL_OPTION: ModelOption = { id: AUTO_MODEL_ID, label: 'Auto' };

export type RouteCategory = 'math' | 'coding' | 'accounting' | 'general';

const CATEGORY_PATTERNS: Record<Exclude<RouteCategory, 'general'>, RegExp> = {
  math: /\$\$|\$[^$\n]+\$|\\frac|\\int|\\sum|integral|turunan|diferensial|matriks|persamaan|aljabar|kalkulus|limit|peluang|statistik|probabilit|derivative|equation|algebra|calculus|matematika|\bmath\b/gi,
  coding: /```|\bkode\b|koding|\bcode\b|\bbug\b|\berror\b|exception|\bfungsi\b|\bfunction\b|\bclass\b|python|javascript|typescript|\breact\b|next\.?js|\bsql\b|\bapi\b|\bscript\b|compile|deploy|regex|debug/gi,
  accounting: /pajak|\bpph\b|\bppn\b|\bpasal\b|jurnal|akuntansi|akuntan|neraca|laba rugi|\bakun\b|\bdebit\b|\bkredit\b|depresiasi|penyusutan|invoice|faktur|\bgaji\b|\bptkp\b|accounting|\btax\b|ledger|balance sheet/gi,
};

/** Pesan user yang lebih pendek dari ini dianggap lanjutan dan mewarisi kategori pesan sebelumnya. */
const FOLLOW_UP_MAX_CHARS = 25;

/** Kategori dari keyword. Kategori dengan kecocokan terbanyak menang. Tidak ada kecocokan berarti general. */
export function classifyText(text: string): RouteCategory {
  let best: RouteCategory = 'general';
  let bestScore = 0;
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS) as [Exclude<RouteCategory, 'general'>, RegExp][]) {
    const score = (text.match(pattern) ?? []).length;
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return best;
}

/** Ambil teks dari setiap pesan user, berurutan dari lama ke baru. */
export function getUserTexts(messages: UIMessage[]): string[] {
  return messages
    .filter((message) => message.role === 'user')
    .map((message) =>
      message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join(' '),
    );
}

/** Baca AIGWEH_ROUTES berupa JSON, mis. {"math":"id/model","coding":"id/model"}. Hanya id yang diizinkan yang dipakai. */
function parseRoutes(raw: string | undefined, allowed: string[]): Partial<Record<RouteCategory, string>> {
  if (!raw?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const routes: Partial<Record<RouteCategory, string>> = {};
    for (const [category, modelId] of Object.entries(parsed)) {
      if (typeof modelId === 'string' && allowed.includes(modelId)) {
        routes[category as RouteCategory] = modelId;
      }
    }
    return routes;
  } catch {
    return {};
  }
}

/**
 * Pilih model konkret untuk modelId `auto`.
 * Kategori dicari dari pesan user terakhir. Jika pesan itu pendek dan umum, pakai pesan sebelumnya.
 * Kategori tanpa route memakai route `general`, lalu model pertama dari whitelist.
 */
export function resolveAutoModel(
  userTexts: string[],
  env: EnvLike = process.env,
): { modelId: string; category: RouteCategory } {
  let category: RouteCategory = 'general';
  for (const text of userTexts.slice(-2).reverse()) {
    category = classifyText(text);
    if (category !== 'general' || text.trim().length >= FOLLOW_UP_MAX_CHARS) break;
  }

  const allowed = getAllowedModels(env).map((model) => model.id);
  const routes = parseRoutes(env.AIGWEH_ROUTES, allowed);
  const modelId = routes[category] ?? routes.general ?? allowed[0] ?? '';
  return { modelId, category };
}
