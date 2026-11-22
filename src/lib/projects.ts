import { db } from "./db";
import type { Activity, Project } from "./types";

export interface ProjectSummary {
  id: string;
  name: string;
  contract_start: string;
  contract_finish: string;
  created_at: string;
  activity_count: number;
  last_data_date: string | null;
}

export function listProjects(companyId: string): ProjectSummary[] {
  return db
    .prepare(
      `SELECT p.id, p.name, p.contract_start, p.contract_finish, p.created_at,
        (SELECT COUNT(*) FROM activities a WHERE a.project_id = p.id) AS activity_count,
        (SELECT MAX(data_date) FROM progress g WHERE g.project_id = p.id) AS last_data_date
       FROM projects p WHERE p.company_id = ? ORDER BY p.created_at DESC`,
    )
    .all(companyId) as unknown as ProjectSummary[];
}

/** Load a full project, scoped to the company (returns undefined if not theirs) */
export function getProject(companyId: string, projectId: string): Project | undefined {
  const p = db
    .prepare("SELECT * FROM projects WHERE id = ? AND company_id = ?")
    .get(projectId, companyId) as
    | { id: string; name: string; contract_start: string; contract_finish: string }
    | undefined;
  if (!p) return undefined;

  type ARow = {
    id: string; name: string; zone: string; floor: string; category: string; type: string;
    budget_cost: number; budget_manhours: number;
    early_start: string; early_finish: string; late_start: string; late_finish: string;
  };
  const rows = db.prepare("SELECT * FROM activities WHERE project_id = ?").all(p.id) as unknown as ARow[];
  const prog = db
    .prepare("SELECT activity_id, data_date, actual_pct, actual_cost FROM progress WHERE project_id = ? ORDER BY data_date")
    .all(p.id) as unknown as { activity_id: string; data_date: string; actual_pct: number; actual_cost: number }[];

  const map = new Map<string, Activity>();
  for (const r of rows) {
    map.set(r.id, {
      id: r.id, name: r.name, zone: r.zone, floor: r.floor, category: r.category, type: r.type,
      budgetCost: r.budget_cost, budgetManhours: r.budget_manhours,
      earlyStart: r.early_start, earlyFinish: r.early_finish,
      lateStart: r.late_start, lateFinish: r.late_finish,
      actualProgress: {}, actualCost: {},
    });
  }
  const dates = new Set<string>();
  for (const g of prog) {
    const a = map.get(g.activity_id);
    if (!a) continue;
    a.actualProgress[g.data_date] = g.actual_pct;
    a.actualCost[g.data_date] = g.actual_cost;
    dates.add(g.data_date);
  }
  return {
    id: p.id,
    name: p.name,
    contractStart: p.contract_start,
    contractFinish: p.contract_finish,
    dataDates: [...dates].sort(),
    activities: [...map.values()],
  };
}

/** Insert a whole project (activities + progress) in one transaction */
export function saveProject(companyId: string, userId: string, project: Omit<Project, "id">): string {
  const id = crypto.randomUUID();
  const insA = db.prepare(
    `INSERT INTO activities (project_id, id, name, zone, floor, category, type, budget_cost, budget_manhours,
      early_start, early_finish, late_start, late_finish) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insP = db.prepare(
    "INSERT INTO progress (project_id, activity_id, data_date, actual_pct, actual_cost) VALUES (?,?,?,?,?)",
  );
  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO projects (id, company_id, name, contract_start, contract_finish, created_by) VALUES (?,?,?,?,?,?)",
    ).run(id, companyId, project.name, project.contractStart, project.contractFinish, userId);
    for (const a of project.activities) {
      insA.run(id, a.id, a.name, a.zone, a.floor, a.category, a.type, a.budgetCost, a.budgetManhours,
        a.earlyStart, a.earlyFinish, a.lateStart, a.lateFinish);
      for (const [d, pct] of Object.entries(a.actualProgress)) {
        insP.run(id, a.id, d, pct, a.actualCost[d] ?? 0);
      }
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return id;
}

export function deleteProject(companyId: string, projectId: string) {
  db.prepare("DELETE FROM projects WHERE id = ? AND company_id = ?").run(projectId, companyId);
}

function tx<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function logAudit(projectId: string, user: { id: string; name: string }, action: string, details = "") {
  db.prepare("INSERT INTO audit_log (project_id, user_id, user_name, action, details) VALUES (?,?,?,?,?)")
    .run(projectId, user.id, user.name, action, details);
}

export function getAudit(projectId: string, limit = 50) {
  // spread: node:sqlite rows have a null prototype, which can't be passed to client components
  return (db
    .prepare("SELECT user_name, action, details, created_at FROM audit_log WHERE project_id = ? ORDER BY id DESC LIMIT ?")
    .all(projectId, limit) as unknown as { user_name: string; action: string; details: string; created_at: string }[])
    .map((r) => ({ ...r }));
}

/** Project header row only (company-scoped) */
export function getProjectMeta(companyId: string, projectId: string) {
  const r = db
    .prepare("SELECT id, name, contract_start, contract_finish FROM projects WHERE id = ? AND company_id = ?")
    .get(projectId, companyId) as { id: string; name: string; contract_start: string; contract_finish: string } | undefined;
  return r && { ...r };
}

export function createEmptyProject(companyId: string, userId: string, p: { name: string; contractStart: string; contractFinish: string }) {
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO projects (id, company_id, name, contract_start, contract_finish, created_by) VALUES (?,?,?,?,?,?)",
  ).run(id, companyId, p.name, p.contractStart, p.contractFinish, userId);
  return id;
}

export function updateProjectMeta(projectId: string, p: { name: string; contractStart: string; contractFinish: string }) {
  db.prepare("UPDATE projects SET name = ?, contract_start = ?, contract_finish = ? WHERE id = ?")
    .run(p.name, p.contractStart, p.contractFinish, projectId);
}

export function activityIds(projectId: string): string[] {
  return (db.prepare("SELECT id FROM activities WHERE project_id = ?").all(projectId) as { id: string }[]).map((r) => r.id);
}

export function activityHasProgress(projectId: string, activityId: string) {
  return !!db.prepare("SELECT 1 FROM progress WHERE project_id = ? AND activity_id = ? AND actual_pct > 0 LIMIT 1")
    .get(projectId, activityId);
}

export function upsertActivity(projectId: string, originalId: string | null, a: Omit<Activity, "actualProgress" | "actualCost">) {
  tx(() => {
    if (originalId) {
      db.prepare(
        `UPDATE activities SET id=?, name=?, zone=?, floor=?, category=?, type=?, budget_cost=?, budget_manhours=?,
          early_start=?, early_finish=?, late_start=?, late_finish=? WHERE project_id=? AND id=?`,
      ).run(a.id, a.name, a.zone, a.floor, a.category, a.type, a.budgetCost, a.budgetManhours,
        a.earlyStart, a.earlyFinish, a.lateStart, a.lateFinish, projectId, originalId);
      if (originalId !== a.id) {
        db.prepare("UPDATE progress SET activity_id = ? WHERE project_id = ? AND activity_id = ?").run(a.id, projectId, originalId);
      }
    } else {
      db.prepare(
        `INSERT INTO activities (project_id, id, name, zone, floor, category, type, budget_cost, budget_manhours,
          early_start, early_finish, late_start, late_finish) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(projectId, a.id, a.name, a.zone, a.floor, a.category, a.type, a.budgetCost, a.budgetManhours,
        a.earlyStart, a.earlyFinish, a.lateStart, a.lateFinish);
    }
  });
}

export function deleteActivity(projectId: string, activityId: string) {
  tx(() => {
    db.prepare("DELETE FROM progress WHERE project_id = ? AND activity_id = ?").run(projectId, activityId);
    db.prepare("DELETE FROM activities WHERE project_id = ? AND id = ?").run(projectId, activityId);
  });
}

/** Save one data date's progress for many activities (insert or replace) */
export function saveProgressRows(
  projectId: string,
  dataDate: string,
  rows: { activityId: string; pct: number; cost: number }[],
  userId: string,
) {
  const stmt = db.prepare(
    `INSERT INTO progress (project_id, activity_id, data_date, actual_pct, actual_cost, updated_by, updated_at)
     VALUES (?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(project_id, activity_id, data_date)
     DO UPDATE SET actual_pct=excluded.actual_pct, actual_cost=excluded.actual_cost,
       updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
  );
  tx(() => {
    for (const r of rows) stmt.run(projectId, r.activityId, dataDate, r.pct, r.cost, userId);
  });
}

export function deleteDataDate(projectId: string, dataDate: string) {
  db.prepare("DELETE FROM progress WHERE project_id = ? AND data_date = ?").run(projectId, dataDate);
}
