"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createCompanyWithOwner, findUserByEmail } from "./db";
import { getTr } from "./i18n-server";
import { SESSION_COOKIE, cookieOptions, signSession } from "./session";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const tr = await getTr();
  const company = String(form.get("company") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const values = { company, name, email };
  if (!company || !name) return { error: tr("اسم الشركة والاسم مطلوبين", "Company name and your name are required"), values };
  if (!emailRe.test(email)) return { error: tr("البريد الإلكتروني غير صالح", "Invalid email address"), values };
  if (password.length < 8) return { error: tr("كلمة المرور لازم تكون 8 أحرف على الأقل", "Password must be at least 8 characters"), values };
  if (findUserByEmail(email)) return { error: tr("هذا البريد مسجّل مسبقاً", "This email is already registered"), values };

  const userId = createCompanyWithOwner({
    company, name, email, passwordHash: await bcrypt.hash(password, 12),
  });
  (await cookies()).set(SESSION_COOKIE, await signSession(userId), cookieOptions);
  redirect("/");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const tr = await getTr();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { error: tr("البريد أو كلمة المرور غير صحيحة", "Incorrect email or password"), values: { email } };
  }
  (await cookies()).set(SESSION_COOKIE, await signSession(user.id), cookieOptions);
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
