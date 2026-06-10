import type { RecordStatus, RelationshipType } from "@/app/_lib/demo/people-demo-data";

/** Fields edited in Overview → Account that also appear in the detail hero. */
export type SharedAccountFields = {
  recordStatus: RecordStatus;
  onRecordStatusChange: (status: RecordStatus) => void;
  relationship: RelationshipType;
  onRelationshipChange: (relationship: RelationshipType) => void;
};
