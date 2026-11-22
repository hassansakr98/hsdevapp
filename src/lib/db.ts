import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// Local SQLite database (Node built-in). Swap for PostgreSQL before production.
const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });

const g = globalThis as unknown as { __db?: DatabaseSync };
export const db = g.__db ?? new DatabaseSync(path.join(dir, "app.db"));
g.__db = db;

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface UserRow {
  id: string;
  company_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "owner" | "admin" | "member";
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
}

export function findUserById(id: string) {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.company_id, c.name AS company_name
       FROM users u JOIN companies c ON c.id = u.company_id WHERE u.id = ?`,
    )
    .get(id) as
    | { id: string; name: string; email: string; role: string; company_id: string; company_name: string }
    | undefined;
}

export function createCompanyWithOwner(input: { company: string; name: string; email: string; passwordHash: string }) {
  const companyId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  db.exec("BEGIN");
  try {
    db.prepare("INSERT INTO companies (id, name) VALUES (?, ?)").run(companyId, input.company);
    db.prepare(
      "INSERT INTO users (id, company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, 'owner')",
    ).run(userId, companyId, input.name, input.email, input.passwordHash);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return userId;
}
