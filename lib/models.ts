import { id } from 'zod/locales';
import type { ModelOption } from './types';

export type EnvLike = Record<string, string | undefined>;

const DEFAULT_MODELS: ModelOption[] = [
  { id: 'groq/openai/gpt-oss-120b', label: 'GPT OSS 120B' },
  { id: 'TG/deepseek-v4.1-flash', label: 'Deepseek V4.1 Flash TG' },
  { id: 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra 550B A55B'},
];

/** Daftar model yang diizinkan. Diatur lewat AIGWEH_MODELS (dipisah koma). */
export function getAllowedModels(env: EnvLike = process.env): ModelOption[] {
  const raw = env.AIGWEH_MODELS?.trim();
  if (!raw) return DEFAULT_MODELS;

  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => ({ id, label: id }));
}

export function isAllowedModel(modelId: string, env: EnvLike = process.env): boolean {
  return getAllowedModels(env).some((model) => model.id === modelId);
}
