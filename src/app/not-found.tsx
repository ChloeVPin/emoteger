import Link from "next/link";
import { Button } from "@/components/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="enter flex min-h-dvh flex-col justify-center px-6 pb-[12vh] sm:px-10">
      <div className="mx-auto w-full max-w-[340px]">
        <Logo size={36} className="opacity-70 grayscale" />
        <h1 className="display mt-5 text-[18px] font-semibold">Nothing here</h1>
        <p className="mt-1 text-fg-2">This server isn&rsquo;t available to you, or the link is wrong.</p>
        <Button variant="quiet" render={<Link href="/servers" />} className="mt-6">
          Back to servers
        </Button>
      </div>
    </main>
  );
}
