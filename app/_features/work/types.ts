import type { Connection, PersonNote } from "@/app/_lib/demo/people-demo-data";
import type {
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/profile/types";
import type { WorkStatus } from "./data";

export type WorkProfileFieldKey =
  | "status"
  | "project_type"
  | "description"
  | "deadline"
  | "start_date";

export interface WorkHealthFactor {
  factor: string;
  impact: number;
  reason: string;
}

export interface WorkDetailSummary {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  description: string | null;
  projectType: string | null;
  org: { id: string; name: string } | null;
  clientId: string | null;
  people: Array<{ id: string; name: string; title: string | null }>;
  startDate: string | null;
  deadline: string | null;
  stageEnteredAt: string | null;
  healthScore: number | null;
  healthBand: string | null;
  healthFactors: WorkHealthFactor[] | null;
  healthUpdatedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface WorkProfileFieldProvenanceView {
  field: WorkProfileFieldKey | string;
  value: string | null;
  source: ProfileProvenanceSource;
  ruleId: string | null;
  confidence: number | null;
  because: string | null;
  status: ProfileProvenanceStatus;
  evidence: Record<string, unknown>;
  setAt: string;
}

export interface WorkProfileFieldsView {
  workId: string;
  status: string | null;
  projectType: string | null;
  description: string | null;
  deadline: string | null;
  startDate: string | null;
  provenance: WorkProfileFieldProvenanceView[];
}

export type WorkActivityEvent = {
  id: string;
  at: string;
  kind: "keeper" | "ai" | "user" | "system";
  label: string;
  detail: string | null;
  field: string;
  source: ProfileProvenanceSource;
  status: ProfileProvenanceStatus;
};

export interface WorkDetailViewModel {
  id: string;
  title: string;
  status: WorkStatus;
  progress: number;
  overdue: boolean;
  org?: { id: string; name: string };
  description: string | null;
  slug: string | null;
  projectType: string | null;
  tags: string[];
  lastActivityAt: string;
  createdAt: string | null;
  source: "user" | "imported" | "salt_inferred";
  signals: [];
  contactCount: number;
  connections: Connection[];
  health: {
    score: number;
    band: string;
    factors: WorkHealthFactor[];
  } | null;
  summary: string;
}

export interface WorkDetailData {
  summary: WorkDetailSummary | null;
  profileFields: WorkProfileFieldsView | null;
  connections: Connection[];
  activity: WorkActivityEvent[];
  notes: PersonNote[];
}
