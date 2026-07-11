export type EnrichableEntityType =
  | "person"
  | "org"
  | "work"
  | "billing"
  | "meeting"
  | "file"
  | "me";

export type ConnectorCategory =
  | "email"
  | "calendar"
  | "billing"
  | "crm"
  | "meetings"
  | "documents"
  | "project_management"
  | "storage";

export interface SourcedField {
  value: string | number | boolean;
  source: string;
  confidence: number;
  raw?: string;
}

export interface ConnectionCandidate {
  name: string;
  domain?: string;
  email?: string;
  source: string;
}

export interface BillingConnectionCandidate {
  invoiceId?: string;
  customerId?: string;
  amount?: number;
  currency?: string;
  description?: string;
  source: string;
}

export interface MeetingConnectionCandidate {
  title: string;
  startTime?: string;
  endTime?: string;
  attendees?: string[];
  source: string;
}

export interface FileConnectionCandidate {
  name: string;
  url?: string;
  mimeType?: string;
  source: string;
}

export interface ExtractedNote {
  content: string;
  source: string;
  timestamp?: string;
}

export interface EnrichmentConnections {
  orgs?: ConnectionCandidate[];
  work?: ConnectionCandidate[];
  people?: ConnectionCandidate[];
  billing?: BillingConnectionCandidate[];
  meetings?: MeetingConnectionCandidate[];
  files?: FileConnectionCandidate[];
}

export interface EnrichmentResult {
  entityType: EnrichableEntityType;
  fields: Record<string, SourcedField>;
  connections: EnrichmentConnections;
  notes: ExtractedNote[];
  sourcesQueried: string[];
  sourcesWithData: string[];
}

export interface EnrichmentSeed {
  // Common
  name?: string;
  email?: string;
  domain?: string;
  phone?: string;
  // Work/billing
  projectName?: string;
  invoiceNumber?: string;
  amount?: number;
  // Meeting
  meetingTitle?: string;
  startTime?: string;
  attendees?: string[];
  // File
  fileName?: string;
  fileUrl?: string;
  mimeType?: string;
}

export interface EnrichmentRequest {
  entityType: EnrichableEntityType;
  seed: EnrichmentSeed;
  workspaceId: string;
}

export interface ExtractorConnections {
  orgs?: Omit<ConnectionCandidate, "source">[];
  work?: Omit<ConnectionCandidate, "source">[];
  people?: Omit<ConnectionCandidate, "source">[];
  billing?: Omit<BillingConnectionCandidate, "source">[];
  meetings?: Omit<MeetingConnectionCandidate, "source">[];
  files?: Omit<FileConnectionCandidate, "source">[];
}

export interface ExtractorResult {
  source: string;
  fields: Record<string, Omit<SourcedField, "source">>;
  connections?: ExtractorConnections;
  notes?: Omit<ExtractedNote, "source">[];
  hasData: boolean;
}
