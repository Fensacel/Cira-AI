/** Bentuk hasil standar semua skill. Error dikembalikan ke model, tidak dilempar. */
export type SkillError = { success: false; error: string };

export function errorResult(err: unknown): SkillError {
  return { success: false, error: err instanceof Error ? err.message : String(err) };
}

/** Pembulatan ke 2 desimal untuk nilai rupiah dan persentase tampilan. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
