import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const DEFAULT_BASE_URL = 'http://localhost:20128/v1';

/**
 * Provider OpenAI-compatible yang mengarah ke 9router.
 * Hanya dipanggil di server (route handler). API key tidak pernah dikirim ke browser.
 */
function getNineRouterApiKey(): string {
  const apiKey = process.env.NINEROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('NINEROUTER_API_KEY belum diatur di environment server.');
  }
  return apiKey;
}

function getNineRouterBaseUrl(): string {
  return process.env.NINEROUTER_BASE_URL ?? DEFAULT_BASE_URL;
}

export function getNineRouterProvider() {
  return createOpenAICompatible({
    name: 'nine-router',
    baseURL: getNineRouterBaseUrl(),
    apiKey: getNineRouterApiKey(),
  });
}
