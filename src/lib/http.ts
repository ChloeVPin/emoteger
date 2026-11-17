import "server-only";
import { NextResponse } from "next/server";
import { DiscordError, type RateState } from "./discord";
import { env } from "./env";

export function appOrigin(request: Request) {
  return env.appUrl ?? new URL(request.url).origin;
}

export function errorResponse(error: unknown) {
  if (error instanceof DiscordError) {
    const headers = error.retryAfter !== undefined ? { "Retry-After": String(error.retryAfter) } : undefined;
    return NextResponse.json({ error: error.message, retryAfter: error.retryAfter }, { status: error.status, headers });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

/** 204 that forwards Discord's remaining budget so the client can pace itself. */
export function deletedResponse(rate: RateState) {
  const headers = new Headers();
  if (rate.remaining !== null) headers.set("x-ratelimit-remaining", String(rate.remaining));
  if (rate.resetAfter !== null) headers.set("x-ratelimit-reset-after", String(rate.resetAfter));
  return new NextResponse(null, { status: 204, headers });
}
