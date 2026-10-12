export type ModelOption = {
  id: string;
  label: string;
};

/** Metadata yang dikirim server pada pesan asisten saat stream selesai. */
export type ChatMetadata = {
  /** Model yang benar-benar menjawab (sudah di-resolve jika memakai Auto). */
  modelId?: string;
  outputTokens?: number;
  tokensPerSecond?: number;
};
