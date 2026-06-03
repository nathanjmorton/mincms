"use server";

import { redirect } from "next/navigation";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";

export async function login(_prev: unknown, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const ok = await verifyPassword(password);
  if (!ok) {
    return { error: "Incorrect password." };
  }
  const token = await createSession();
  await setSessionCookie(token);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/login");
}
