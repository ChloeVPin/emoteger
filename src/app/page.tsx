import { redirect } from "next/navigation";
import { buttonClass } from "@/components/button";
import { DiscordIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/session";

const ERRORS: Record<string, string> = {
  access_denied: "Sign in was cancelled.",
  state: "That sign-in link expired. Try again.",
  exchange: "Discord didn't accept the sign-in. Try again.",
  expired: "Your session ended. Sign in again.",
};

export default async function SignIn({ searchParams }: PageProps<"/">) {
  if (await getSession()) redirect("/servers");
  const { error } = await searchParams;
  const message = typeof error === "string" ? (ERRORS[error] ?? ERRORS.exchange) : null;

  return (
    <main className="enter flex min-h-dvh flex-col justify-center px-6 pb-[12vh] sm:px-10">
      <div className="mx-auto w-full max-w-[340px]">
        <Logo size={44} priority />
        <h1 className="display mt-6 text-[22px] font-semibold">Emoteger</h1>
        <p className="mt-1 text-[15px] text-fg-2">Manage your server&rsquo;s emotes.</p>
        <a href="/api/auth/login" className={buttonClass("sun", "lg", "mt-8 w-full")}>
          <DiscordIcon size={17} />
          Continue with Discord
        </a>
        {message ? (
          <p role="alert" className="mt-4 text-[13px] text-fg-2">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
