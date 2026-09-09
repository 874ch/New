import { createHash, randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';

import { db } from '@/lib/db';

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_DAYS = 7;

/** Seul le hash du token vit en base : une fuite de la table ne donne pas de session utilisable. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAdminSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.adminSession.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
}

export async function getAdminSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  store.delete(SESSION_COOKIE);
}
