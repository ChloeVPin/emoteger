import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/http";
import { SESSION_COOKIE } from "@/lib/session";

/** Clears a session Discord no longer accepts. */
export async function GET(request: Request) {
  const response = NextResponse.redirect(`${appOrigin(request)}/?error=expired`);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
