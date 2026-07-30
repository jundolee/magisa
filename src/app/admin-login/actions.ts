"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, sha256Hex } from "@/lib/admin-auth";

export async function adminLoginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/sources");
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword || password !== expectedPassword) {
    redirect(`/admin-login?error=1&next=${encodeURIComponent(next)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, await sha256Hex(expectedPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: "/",
  });

  redirect(next);
}
