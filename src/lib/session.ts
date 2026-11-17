import "server-only";
import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

export const SESSION_COOKIE = "emoteger_session";
export const STATE_COOKIE = "emoteger_oauth_state";

export type SessionUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SessionUser;
};

let keyPromise: Promise<Uint8Array> | null = null;
function key() {
  keyPromise ??= crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(env.sessionSecret))
    .then((buf) => new Uint8Array(buf));
  return keyPromise;
}

export async function sealSession(session: Session) {
  return new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(session.expiresAt / 1000))
    .encrypt(await key());
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, await key());
    const session = payload as unknown as Session;
    if (!session.accessToken || session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = (expiresAt: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires: new Date(expiresAt),
});
