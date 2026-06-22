import type { PersonSignals } from "@/app/_features/capture/services/system-plays/person-signals";
import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";
import type {
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "@/app/_features/plays/playbooks/profile/types";

export type RecordsEntityType =
  | "person"
  | "organization"
  | "shared_alias"
  | "system_sender"
  | "newsletter"
  | "suspicious"
  | "source_artifact";

export type RecordsDecisionAction =
  | "create"
  | "update_existing"
  | "suggest_merge"
  | "suggest_org"
  | "skip"
  | "needs_confirmation";

export interface RecordsInput {
  name?: string;
  email?: string;
  organizationName?: string;
  domain?: string;
  relationshipType?: RelationshipType;
  title?: string | null;
  signals?: PersonSignals;
  explicitRequest?: boolean;
  userInsistsPerson?: boolean;
}

export interface ExistingPersonCandidate {
  id: string;
  name: string;
  email: string | null;
  title?: string | null;
  organizationName?: string | null;
  organizationDomain?: string | null;
}

export interface RecordsClassification {
  entityType: RecordsEntityType;
  normalizedEmail: string | null;
  domain: string | null;
  localPart: string | null;
  suggestedName: string | null;
  reasons: string[];
}

export interface RecordsDecision {
  entityType: RecordsEntityType;
  action: RecordsDecisionAction;
  confidence: number;
  reasons: string[];
  normalizedEmail: string | null;
  domain: string | null;
  suggestedName: string | null;
  suggestedRelationshipType: RelationshipType;
  duplicates: ExistingPersonCandidate[];
  suggestedFields: {
    name?: string;
    email?: string;
    relationship_type?: RelationshipType;
    title?: string | null;
    org_domain?: string | null;
  };
}

export interface CompletePersonFieldsInput {
  email: string;
  signals?: PersonSignals;
  extractedTitle?: string | null;
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
  blueprintVersion?: number;
}
