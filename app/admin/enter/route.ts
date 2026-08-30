import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminOk, ADMIN_COOKIE } from "@/lib/admin-auth";

/**
 * 토큰을 한 번 받아 쿠키로 바꾼다.
 *
 * 화면(서버 컴포넌트)은 렌더 중에 쿠키를 못 쓴다. 그리고 주소에 토큰을 계속 달고
 * 다니면 브라우저 기록과 공유 링크에 남으므로, 여기서 한 번만 교환한다.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? undefined;
  if ((await adminOk(token)) !== "ok") {
    return new Response("not found", { status: 404 });
  }

  (await cookies()).set(ADMIN_COOKIE, token!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect("/admin");
}
