import { getOwner, withOwnerCookie } from '@/lib/owner';
import { getMemoryStore } from '@/lib/memory-store';

export const dynamic = 'force-dynamic';

export function GET(req: Request): Response {
  const owner = getOwner(req);
  const memories = getMemoryStore().list(owner.id);
  return withOwnerCookie(Response.json({ memories }), owner);
}
