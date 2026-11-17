import "server-only";
import { notFound, redirect } from "next/navigation";
import { DiscordError } from "./discord";
import { getSession } from "./session";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}

/** Maps Discord failures onto navigation: expired tokens sign out, missing access 404s. */
export async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DiscordError) {
      if (error.status === 401) redirect("/api/auth/reset");
      if (error.status === 403 || error.status === 404 || error.status === 409) notFound();
    }
    throw error;
  }
}
