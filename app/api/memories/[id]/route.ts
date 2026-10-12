import { getOwner, withOwnerCookie } from '@/lib/owner';
import { getMemoryStore } from '@/lib/memory-store';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const owner = getOwner(req);
  const { id } = await params;
  const removed = await getMemoryStore().remove(owner.id, id);
  return withOwnerCookie(Response.json({ removed }, { status: removed ? 200 : 404 }), owner);
}
