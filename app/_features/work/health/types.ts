export const WORK_HEALTH_VERSION = 1;

export type WorkHealthBand = "Healthy" | "Watch" | "Needs attention";

export interface WorkHealthFactor {
  factor: string;
  impact: number;
  reason: string;
}

export interface WorkHealthSignals {
  status: string;
  stageEnteredAt: string | null;
  deadline: string | null;
  updatedAt: string | null;
  linkedPeopleCount: number;
  overdueInvoiceCount: number;
}

export interface WorkHealthResult {
  score: number;
  band: WorkHealthBand;
  factors: WorkHealthFactor[];
  version: number;
}
