import { getOwner, withOwnerCookie } from '@/lib/owner';
import { getMemoryStore } from '@/lib/memory-store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const owner = getOwner(req);
  const memories = await getMemoryStore().list(owner.id);
  return withOwnerCookie(Response.json({ memories }), owner);
}
