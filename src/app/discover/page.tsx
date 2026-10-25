import { redirect } from "next/navigation";
import { getAppContext } from "@/server/next/context";

// Drives found online now live in Find's "Found online" tab.
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAppContext();
  const sp = new URLSearchParams({ tab: "online" });
  for (const key of ["place", "topic"]) if (typeof params[key] === "string") sp.set(key, params[key] as string);
  redirect(`${ctx.base}/requests?${sp.toString()}`);
}
