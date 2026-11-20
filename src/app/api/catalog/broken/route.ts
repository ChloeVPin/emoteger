import { NextResponse } from "next/server";
import { check } from "@/lib/catalog/health";
import { resolveCatalogPreview } from "@/lib/catalog/resolve";
import { readJson, signedOut } from "@/lib/http";
import { getSession } from "@/lib/session";
import { isCatalogSource } from "@/lib/types";

/**
 * The browser reports an image that failed to load. We never trust the report itself:
 * we look up the URL from our own data and ask the host. Only a real failure hides it.
 */
export async function POST(request: Request) {
  // The dev harness (/dev) browses without a Discord login; production always requires one.
  if (!(await getSession()) && process.env.NODE_ENV === "production") return signedOut();
  const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === "string" ? body.id.slice(0, 64) : "";
  if (!isCatalogSource(body.source) || !id) return NextResponse.json({ error: "Unknown emote" }, { status: 400 });

  try {
    const url = await resolveCatalogPreview(body.source, id);
    if (!url) return NextResponse.json({ error: "Unknown emote" }, { status: 404 });
    const ok = await check(`${body.source}:${id}`, url);
    return NextResponse.json({ dead: ok === false });
  } catch (error) {
    // Looking the id up needs the catalog index; if its host is down, we just can't tell yet.
    console.error(error);
    return NextResponse.json({ error: "Couldn't check that image right now" }, { status: 502 });
  }
}
