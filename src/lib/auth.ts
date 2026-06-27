// Authentication helpers: password hashing (scrypt), session management.

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';

const COOKIE_NAME = 'iptv_uid';
const SESSION_DURATION_DAYS = 30;

/** Hash a password using scrypt with a random salt. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/** Verify a password against a stored salt:hash string. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

/** Get or create an anonymous session user (identified by a cookie). */
export async function getSessionUser(): Promise<{ id: string; cookie: string; email: string | null; name: string | null; role: string }> {
  const cookieStore = await cookies();
  let cookie = cookieStore.get(COOKIE_NAME)?.value;

  if (!cookie) {
    cookie = `anon_${crypto.randomBytes(16).toString('hex')}`;
  }

  let user = await db.user.findUnique({ where: { cookie } });
  if (!user) {
    try {
      user = await db.user.create({
        data: { cookie, name: 'Guest', role: 'viewer' },
      });
    } catch {
      // Race condition: another request already created this user.
      // Re-fetch it.
      user = await db.user.findUnique({ where: { cookie } });
      if (!user) {
        // If still null, generate a new cookie and retry.
        cookie = `anon_${crypto.randomBytes(16).toString('hex')}`;
        user = await db.user.create({
          data: { cookie, name: 'Guest', role: 'viewer' },
        });
      }
    }
  }

  return {
    id: user.id,
    cookie: user.cookie,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/** Set the session cookie on response (called from API routes). */
export async function setSessionCookie(cookie: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, cookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

/** Clear the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Upgrade an anonymous user to a registered user (signup). */
export async function upgradeAnonymousUser(
  userId: string,
  email: string,
  name: string,
  hashedPassword: string,
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { email, name, password: hashedPassword },
  });
}

/** Find a user by email (for login). */
export async function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email: email.toLowerCase() } });
}

/** Check if the current session user is authenticated (has email + password). */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getSessionUser();
  return !!user.email;
}

export { COOKIE_NAME };
