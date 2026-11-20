import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCode, getCurrentUser } from "@/lib/discord";
import { appOrigin } from "@/lib/http";
import { SESSION_COOKIE, STATE_COOKIE, sealSession, sessionCookieOptions } from "@/lib/session";

export async function GET(request: Request) {
  const origin = appOrigin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;

  if (!code || !state || state !== expected) {
    const error = url.searchParams.get("error") ?? "state";
    const response = NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error)}`);
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  try {
    const token = await exchangeCode(code, `${origin}/api/auth/callback`);
    const me = await getCurrentUser(token.access_token);
    const expiresAt = Date.now() + token.expires_in * 1000;
    const sealed = await sealSession({
      accessToken: token.access_token,
      expiresAt,
      user: { id: me.id, username: me.username, globalName: me.global_name, avatar: me.avatar },
    });
    const response = NextResponse.redirect(`${origin}/servers`);
    response.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions(expiresAt));
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${origin}/?error=exchange`);
  }
}
