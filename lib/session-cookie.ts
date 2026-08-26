import { cookies } from "next/headers";

export function sessionCookieName(slug: string): string {
  return `st_s_${slug}`;
}

export async function currentSessionId(slug: string): Promise<string | null> {
  return (await cookies()).get(sessionCookieName(slug))?.value ?? null;
}
