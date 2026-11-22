export interface Activity {
  id: string;
  name: string;
  zone: string;
  floor: string;
  category: string;
  type: string;
  budgetCost: number;
  budgetManhours: number;
  earlyStart: string; // ISO date
  earlyFinish: string;
  lateStart: string;
  lateFinish: string;
  /** Actual cumulative progress (0..1) recorded at each data date (ISO -> value) */
  actualProgress: Record<string, number>;
  /** Actual cost incurred at each data date (cumulative) */
  actualCost: Record<string, number>;
}

export interface Project {
  id: string;
  name: string;
  contractStart: string;
  contractFinish: string;
  dataDates: string[]; // ascending ISO dates where progress was recorded
  activities: Activity[];
}

export interface Filters {
  zone: string;
  floor: string;
  category: string;
  type: string;
  dataDate: string;
}
