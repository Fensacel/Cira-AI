/** Cookie anonim per browser. Bukan login: memori terikat ke browser ini. */
export const OWNER_COOKIE = 'aigweh_uid';

const OWNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

export type Owner = { id: string; isNew: boolean };

export function getOwner(req: Request): Owner {
  const cookieHeader = req.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name === OWNER_COOKIE && OWNER_ID_PATTERN.test(value)) {
      return { id: value, isNew: false };
    }
  }
  return { id: crypto.randomUUID(), isNew: true };
}

/** Menambahkan Set-Cookie hanya jika owner baru dibuat. */
export function withOwnerCookie(response: Response, owner: Owner): Response {
  if (owner.isNew) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.headers.append(
      'Set-Cookie',
      `${OWNER_COOKIE}=${owner.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_YEAR_SEC}${secure}`,
    );
  }
  return response;
}
