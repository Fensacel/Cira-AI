import { getAllowedModels, type EnvLike } from './models';

/**
 * Urutan model untuk membuat judul chat. Diatur lewat AIGWEH_TITLE_MODELS (dipisah koma).
 * Jika kosong, pakai model pertama dari daftar yang diizinkan. Hanya id yang ada di whitelist yang dipakai.
 */
export function getTitleModelCandidates(env: EnvLike = process.env): string[] {
  const allowed = getAllowedModels(env).map((model) => model.id);
  const raw = env.AIGWEH_TITLE_MODELS?.trim();
  const configured = raw
    ? raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];
  const ordered = configured.length > 0 ? configured : allowed.slice(0, 1);
  return ordered.filter((id, index) => allowed.includes(id) && ordered.indexOf(id) === index);
}
