import { notFound } from "next/navigation";

export default async function Dev({ searchParams }: PageProps<"/dev">) {
  // A constant-false branch in production builds, so the harness and its fixtures are never bundled.
  if (process.env.NODE_ENV !== "production") {
    const { DevHarness } = await import("@/dev/harness");
    return <DevHarness searchParams={await searchParams} />;
  }
  notFound();
}
