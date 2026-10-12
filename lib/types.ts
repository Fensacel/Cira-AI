export type ModelOption = {
  id: string;
  label: string;
};

/** Metadata yang dikirim server pada pesan asisten saat stream selesai. */
export type ChatMetadata = {
  outputTokens?: number;
  tokensPerSecond?: number;
};
