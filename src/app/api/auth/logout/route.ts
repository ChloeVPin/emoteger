import { NextResponse } from "next/server";
import { revokeToken } from "@/lib/discord";
import { appOrigin } from "@/lib/http";
import { SESSION_COOKIE, getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (session) await revokeToken(session.accessToken);
  const response = NextResponse.redirect(`${appOrigin(request)}/`, { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
