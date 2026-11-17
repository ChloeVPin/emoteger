import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/discord";
import { appOrigin } from "@/lib/http";
import { STATE_COOKIE } from "@/lib/session";

export async function GET(request: Request) {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(authorizeUrl(`${appOrigin(request)}/api/auth/callback`, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
