import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  get clientId() {
    return required("CLIENT_ID");
  },
  get clientSecret() {
    return required("CLIENT_SECRET");
  },
  get botToken() {
    return required("BOT_TOKEN");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  /**
   * Optional. Falls back to the incoming request origin. An empty value (as copied from
   * .env.example) counts as unset, and a trailing slash is dropped so paths join cleanly.
   */
  appUrl: process.env.APP_URL?.replace(/\/+$/, "") || undefined,
};
