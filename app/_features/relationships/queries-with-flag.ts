/**
 * Feature-flag-aware queries for relationships
 *
 * These functions check the USE_NEW_ENTITY_MODEL flag and route to either:
 * - Old queries (clients table) - default, full metrics
 * - New queries (organizations + people tables) - basic data, metrics coming later
 *
 * Usage:
 *   import { getRelationshipsList } from './queries-with-flag'
 *   const data = await getRelationshipsList({ view: 'active' })
 */

import { isFeatureEnabled, FeatureFlag } from "@/app/_lib/feature-flags";
import { getClientsWithMetrics, type ClientWithMetrics, type ClientViewFilter } from "@/app/actions/clients/get-clients-with-metrics";
import { getAllRelationships, getRelationshipCounts } from "./queries";
import type { RelationshipEntity, RelationshipStatus } from "./types";

// ============================================================================
// Unified List Item Type (works with both old and new data)
// ============================================================================

export interface RelationshipListItem {
  id: string;
  name: string;
  entityType: "person" | "organization" | "client"; // "client" for legacy
  email: string | null;
  phone: string | null;
  status: RelationshipStatus | string;
  createdAt: string;
  // Optional fields (may not be available from new queries yet)
  company?: { id: string; name: string } | null;
  projectCount?: number;
  mrr?: number;
  ltv?: number;
  healthScore?: number;
  tags?: Array<{ id: string; label: string; color: string }>;
  lifecycleStage?: string;
  stageEnteredAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
  // New entity fields
  title?: string | null;
  website?: string | null;
  industry?: string | null;
  organizationName?: string | null;
  primaryContactName?: string | null;
  hasPortalAccess?: boolean;
}

// ============================================================================
// List Query (Feature Flag Aware)
// ============================================================================

export interface GetRelationshipsListOptions {
  view?: "active" | "archived" | "deleted";
  status?: RelationshipStatus;
  type?: "person" | "organization";
  search?: string;
}

/**
 * Get relationships list with feature flag support.
 * Returns data from old or new tables based on USE_NEW_ENTITY_MODEL flag.
 */
export async function getRelationshipsList(
  options?: GetRelationshipsListOptions
): Promise<RelationshipListItem[]> {
  const useNewModel = isFeatureEnabled(FeatureFlag.USE_NEW_ENTITY_MODEL);

  if (useNewModel) {
    return getRelationshipsListFromNewTables(options);
  } else {
    return getRelationshipsListFromOldTables(options);
  }
}

/**
 * Get from OLD tables (clients) - includes full metrics
 */
async function getRelationshipsListFromOldTables(
  options?: GetRelationshipsListOptions
): Promise<RelationshipListItem[]> {
  const viewFilter = options?.view || "active";

  const clients = await getClientsWithMetrics({
    view: viewFilter as ClientViewFilter,
    search: options?.search,
  });

  return clients.map((client): RelationshipListItem => ({
    id: client.id,
    name: client.name,
    entityType: "client",
    email: client.contactEmail,
    phone: client.contactPhone,
    status: mapLifecycleToRelationshipStatus(client.lifecycleStage),
    createdAt: client.createdAt,
    company: client.company,
    projectCount: client.projectCount,
    mrr: client.mrr,
    ltv: client.ltv,
    healthScore: client.healthScore,
    tags: client.tags,
    lifecycleStage: client.lifecycleStage,
    stageEnteredAt: client.stageEnteredAt,
    archivedAt: client.archivedAt,
    deletedAt: client.deletedAt,
  }));
}

/**
 * Get from NEW tables (organizations + people) - basic data for now
 */
async function getRelationshipsListFromNewTables(
  options?: GetRelationshipsListOptions
): Promise<RelationshipListItem[]> {
  const entities = await getAllRelationships({
    status: options?.status,
    type: options?.type,
    search: options?.search,
  });

  return entities.map((entity): RelationshipListItem => ({
    id: entity.id,
    name: entity.name,
    entityType: entity.entityType,
    email: entity.email,
    phone: entity.phone,
    status: entity.relationshipStatus,
    createdAt: entity.createdAt.toISOString(),
    // New entity fields
    title: entity.title,
    website: entity.website,
    industry: entity.industry,
    organizationName: entity.organizationName,
    primaryContactName: entity.primaryContactName,
    hasPortalAccess: entity.hasPortalAccess,
    // Metrics not yet available from new tables
    projectCount: 0,
    mrr: 0,
    ltv: 0,
    tags: [],
  }));
}

// ============================================================================
// Counts Query (Feature Flag Aware)
// ============================================================================

export interface RelationshipsCounts {
  total: number;
  clients: number;
  prospects: number;
  organizations: number;
  people: number;
}

/**
 * Get relationship counts with feature flag support.
 */
export async function getRelationshipsListCounts(): Promise<RelationshipsCounts> {
  const useNewModel = isFeatureEnabled(FeatureFlag.USE_NEW_ENTITY_MODEL);

  if (useNewModel) {
    const counts = await getRelationshipCounts();
    return {
      total: counts.organizations + counts.people,
      clients: counts.clients,
      prospects: counts.prospects,
      organizations: counts.organizations,
      people: counts.people,
    };
  } else {
    // Use old counts from clients table
    const { getClientViewCounts } = await import("@/app/actions/clients/get-clients-with-metrics");
    const counts = await getClientViewCounts();
    return {
      total: counts.active + counts.archived,
      clients: counts.active,
      prospects: 0, // Not tracked in old model
      organizations: 0, // Not tracked in old model
      people: 0, // Not tracked in old model
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

// ============================================================================
// Detail Query (Feature Flag Aware)
// ============================================================================

export interface RelationshipDetail {
  id: string;
  name: string;
  entityType: "person" | "organization" | "client";
  email: string | null;
  phone: string | null;
  status: RelationshipStatus | string;
  createdAt: string;
  updatedAt?: string;
  notes: string | null;
  // Contact info
  contactName?: string | null;
  address?: string | null;
  // Organization-specific
  website?: string | null;
  industry?: string | null;
  // Person-specific
  title?: string | null;
  avatarUrl?: string | null;
  hasPortalAccess?: boolean;
  // Relationships
  organization?: { id: string; name: string } | null;
  primaryContact?: { id: string; name: string; email: string | null } | null;
  people?: Array<{ id: string; name: string; role: string | null; isPrimary: boolean }>;
  // Metrics (from old model)
  projectCount?: number;
  mrr?: number;
  ltv?: number;
  healthScore?: number;
  healthFactors?: Array<{ factor: string; impact: number; reason: string }>;
  activityData?: Array<{ month: string; messages: number; meetings: number }>;
  revenueData?: Array<{ month: string; revenue: number }>;
  tags?: Array<{ id: string; label: string; color: string }>;
  lifecycleStage?: string;
  stageEnteredAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

/**
 * Get relationship detail with feature flag support.
 * Returns data from old or new tables based on USE_NEW_ENTITY_MODEL flag.
 */
export async function getRelationshipDetail(
  id: string,
  entityType?: "person" | "organization"
): Promise<RelationshipDetail | null> {
  const useNewModel = isFeatureEnabled(FeatureFlag.USE_NEW_ENTITY_MODEL);

  if (useNewModel) {
    return getRelationshipDetailFromNewTables(id, entityType);
  } else {
    return getRelationshipDetailFromOldTables(id);
  }
}

/**
 * Get detail from OLD tables (clients) - includes full metrics
 */
async function getRelationshipDetailFromOldTables(
  id: string
): Promise<RelationshipDetail | null> {
  const { getClient } = await import("@/app/actions/clients/get-client");
  const client = await getClient(id);

  if (!client) return null;

  return {
    id: client.id,
    name: client.name,
    entityType: "client",
    email: client.contactEmail,
    phone: client.contactPhone,
    status: mapLifecycleToRelationshipStatus(client.lifecycleStage),
    createdAt: client.createdAt,
    notes: client.notes,
    contactName: client.contactName,
    address: client.address,
    organization: client.company,
    projectCount: client.projectCount,
    mrr: client.mrr,
    ltv: client.ltv,
    healthScore: client.healthScore,
    healthFactors: client.healthFactors,
    activityData: client.activityData,
    revenueData: client.revenueData,
    tags: client.tags,
    lifecycleStage: client.lifecycleStage,
    stageEnteredAt: client.stageEnteredAt,
    archivedAt: client.archivedAt,
    deletedAt: client.deletedAt,
  };
}

/**
 * Get detail from NEW tables (organizations + people) - basic data for now
 */
async function getRelationshipDetailFromNewTables(
  id: string,
  entityType?: "person" | "organization"
): Promise<RelationshipDetail | null> {
  const { getOrganization, getPerson } = await import("./queries");

  // Try to determine entity type if not provided
  if (!entityType) {
    // Try organization first, then person
    const org = await getOrganization(id);
    if (org) {
      return {
        id: org.id,
        name: org.name,
        entityType: "organization",
        email: null,
        phone: null,
        status: org.relationshipStatus,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
        notes: org.notes,
        website: org.website,
        industry: org.industry,
        address: org.address,
        primaryContact: org.primaryContact
          ? {
              id: org.primaryContact.id,
              name: org.primaryContact.name,
              email: org.primaryContact.email,
            }
          : null,
        people: org.people?.map((p) => ({
          id: p.id,
          name: p.name,
          role: null,
          isPrimary: org.primaryContact?.id === p.id,
        })),
        // Metrics not yet available
        projectCount: 0,
        mrr: 0,
        ltv: 0,
        tags: [],
      };
    }

    const person = await getPerson(id);
    if (person) {
      const primaryOrg = person.organizations?.find((o) => o.isPrimary);
      return {
        id: person.id,
        name: person.name,
        entityType: "person",
        email: person.email,
        phone: person.phone,
        status: person.relationshipStatus,
        createdAt: person.createdAt.toISOString(),
        updatedAt: person.updatedAt.toISOString(),
        notes: person.notes,
        title: person.title,
        avatarUrl: person.avatarUrl,
        hasPortalAccess: !!person.portalUserId,
        organization: primaryOrg
          ? { id: primaryOrg.organizationId, name: primaryOrg.organizationName }
          : null,
        // Metrics not yet available
        projectCount: 0,
        mrr: 0,
        ltv: 0,
        tags: [],
      };
    }

    return null;
  }

  // Entity type is specified
  if (entityType === "organization") {
    const org = await getOrganization(id);
    if (!org) return null;

    return {
      id: org.id,
      name: org.name,
      entityType: "organization",
      email: null,
      phone: null,
      status: org.relationshipStatus,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      notes: org.notes,
      website: org.website,
      industry: org.industry,
      address: org.address,
      primaryContact: org.primaryContact
        ? {
            id: org.primaryContact.id,
            name: org.primaryContact.name,
            email: org.primaryContact.email,
          }
        : null,
      people: org.people?.map((p) => ({
        id: p.id,
        name: p.name,
        role: null,
        isPrimary: org.primaryContact?.id === p.id,
      })),
      projectCount: 0,
      mrr: 0,
      ltv: 0,
      tags: [],
    };
  }

  // Person
  const person = await getPerson(id);
  if (!person) return null;

  const primaryOrg = person.organizations?.find((o) => o.isPrimary);
  return {
    id: person.id,
    name: person.name,
    entityType: "person",
    email: person.email,
    phone: person.phone,
    status: person.relationshipStatus,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
    notes: person.notes,
    title: person.title,
    avatarUrl: person.avatarUrl,
    hasPortalAccess: !!person.portalUserId,
    organization: primaryOrg
      ? { id: primaryOrg.organizationId, name: primaryOrg.organizationName }
      : null,
    projectCount: 0,
    mrr: 0,
    ltv: 0,
    tags: [],
  };
}

// ============================================================================
// Helpers
// ============================================================================

function mapLifecycleToRelationshipStatus(
  lifecycle: string | null | undefined
): RelationshipStatus {
  switch (lifecycle) {
    case "lead":
    case "discovery":
    case "pitch":
      return "prospect";
    case "active":
    case "client":
      return "client";
    case "complete":
    case "on_hold":
    case "on-hold":
      return "past_client";
    case "lost":
      return "other";
    default:
      return "prospect";
  }
}
