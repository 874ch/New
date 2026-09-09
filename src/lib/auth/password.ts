import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

/** Hash un mot de passe avec scrypt (natif Node, aucune dépendance binaire). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) {
    return false;
  }

  const hashBuffer = Buffer.from(hash, 'hex');
  const candidateBuffer = scryptSync(password, salt, hashBuffer.length);

  return (
    hashBuffer.length === candidateBuffer.length && timingSafeEqual(hashBuffer, candidateBuffer)
  );
}
