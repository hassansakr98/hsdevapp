import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserById } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";

/** Current user, or redirect to /login */
export async function requireUser() {
  const id = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const user = id ? findUserById(id) : undefined;
  if (!user) redirect("/login");
  return user;
}
