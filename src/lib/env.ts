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
  /** Optional. Falls back to the incoming request origin. */
  appUrl: process.env.APP_URL,
};
