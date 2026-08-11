/**
 * Reference-field → connection projection map (Phase 3 of
 * .cursor/plans/2026-08-10-registry-wiring-record-sourcing.md).
 *
 * A reference field IS a connection: it is projected into the Memory Map
 * graph (`getConnectionsGraphData`) and into both records' connection
 * queries (`getEntityConnections`) at read time — never duplicated into
 * entity_links. This module is the declarative half of that contract:
 *
 * - Every fieldType:"reference" registry field must appear here or in
 *   REFERENCE_FIELD_EXEMPTIONS (registry-parity.test.ts enforces it).
 * - Each projection's `mechanism` is a substring of the projection code in
 *   ./queries.ts (the FK column or junction table it reads), so deleting
 *   the projection fails CI.
 * - Behavioral proof that the projections actually happen lives in
 *   ./reference-projections.test.ts.
 */

import type { ContractEntityType } from "@/app/_features/memory/taxonomy/field-registry";

export interface ReferenceFieldProjection {
  entityType: ContractEntityType;
  /** Registry field key, e.g. "billingContactId". */
  fieldKey: string;
  /** Graph node type the field points at. */
  targetType: "person" | "org" | "work" | "billing" | "meeting" | "resource";
  /**
   * Substring of the projection code in connections/queries.ts — the FK
   * column or junction table the projection reads.
   */
  mechanism: string;
}

export const REFERENCE_FIELD_PROJECTIONS: readonly ReferenceFieldProjection[] =
  [
    {
      entityType: "org",
      fieldKey: "primaryContact",
      targetType: "person",
      mechanism: "organization_people",
    },
    {
      entityType: "work",
      fieldKey: "billingContactId",
      targetType: "person",
      mechanism: "billing_contact_id",
    },
    {
      entityType: "billing",
      fieldKey: "organization",
      targetType: "org",
      mechanism: "organization_id",
    },
    {
      entityType: "billing",
      fieldKey: "billingContact",
      targetType: "person",
      mechanism: "person_id",
    },
    {
      entityType: "billing",
      fieldKey: "linkedWork",
      targetType: "work",
      mechanism: "work_id",
    },
  ];

export interface ReferenceFieldExemption {
  entityType: ContractEntityType;
  fieldKey: string;
  reason: string;
}

export const REFERENCE_FIELD_EXEMPTIONS: readonly ReferenceFieldExemption[] = [
  {
    entityType: "work",
    fieldKey: "serviceId",
    reason:
      "Services are catalog rows, not Memory records — no graph node type exists for them.",
  },
];
