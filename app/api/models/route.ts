import { getAllowedModels } from '@/lib/models';
import { AUTO_MODEL_OPTION } from '@/lib/auto-route';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  // Auto ditaruh pertama agar menjadi default pilihan di client.
  return Response.json({ models: [AUTO_MODEL_OPTION, ...getAllowedModels()] });
}
