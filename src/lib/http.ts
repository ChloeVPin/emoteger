import "server-only";
import { NextResponse } from "next/server";
import { DiscordError, type RateState } from "./discord";
import { env } from "./env";

export function appOrigin(request: Request) {
  return env.appUrl ?? new URL(request.url).origin;
}

/** A request the caller got wrong; its message is safe to show. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The request body as a JSON object, or a 400 for anything else (bad JSON, arrays, null). */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Invalid request body");
  return body as Record<string, unknown>;
}

export function errorResponse(error: unknown) {
  if (error instanceof DiscordError) {
    // Retry-After is whole seconds; the JSON keeps Discord's exact value.
    const headers = error.retryAfter !== undefined ? { "Retry-After": String(Math.ceil(error.retryAfter)) } : undefined;
    return NextResponse.json({ error: error.message, retryAfter: error.retryAfter }, { status: error.status, headers });
  }
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export const signedOut = () => NextResponse.json({ error: "Signed out" }, { status: 401 });

/** Discord's remaining budget, forwarded so the client can pace bulk work. */
export function rateHeaders(rate: RateState) {
  const headers = new Headers();
  if (rate.remaining !== null) headers.set("x-ratelimit-remaining", String(rate.remaining));
  if (rate.resetAfter !== null) headers.set("x-ratelimit-reset-after", String(rate.resetAfter));
  return headers;
}

/** 204 that forwards Discord's remaining budget so the client can pace itself. */
export function deletedResponse(rate: RateState) {
  return new NextResponse(null, { status: 204, headers: rateHeaders(rate) });
}
