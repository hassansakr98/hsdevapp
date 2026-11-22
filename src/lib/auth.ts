"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createCompanyWithOwner, findUserByEmail } from "./db";
import { SESSION_COOKIE, cookieOptions, signSession } from "./session";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const company = String(form.get("company") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const values = { company, name, email };
  if (!company || !name) return { error: "اسم الشركة والاسم مطلوبين", values };
  if (!emailRe.test(email)) return { error: "البريد الإلكتروني غير صالح", values };
  if (password.length < 8) return { error: "كلمة المرور لازم تكون 8 أحرف على الأقل", values };
  if (findUserByEmail(email)) return { error: "هذا البريد مسجّل مسبقاً", values };

  const userId = createCompanyWithOwner({
    company, name, email, passwordHash: await bcrypt.hash(password, 12),
  });
  (await cookies()).set(SESSION_COOKIE, await signSession(userId), cookieOptions);
  redirect("/");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { error: "البريد أو كلمة المرور غير صحيحة", values: { email } };
  }
  (await cookies()).set(SESSION_COOKIE, await signSession(user.id), cookieOptions);
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
