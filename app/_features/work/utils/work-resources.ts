import type { Resource } from "@/app/_lib/resources/types";

export interface WorkResourceSplit {
  /** Linked resources filed as contracts (MSA, SOW, amendments). */
  contracts: Resource[];
  /** Everything else linked to the work record. */
  other: Resource[];
}

/**
 * Splits a work record's linked resources into the contract subsection and
 * the general resources list. Contract is a category convention
 * (`fileCategory === "contract"`), not a separate column.
 */
export function splitWorkResources(resources: Resource[]): WorkResourceSplit {
  const contracts: Resource[] = [];
  const other: Resource[] = [];

  for (const resource of resources) {
    if (resource.fileCategory === "contract") {
      contracts.push(resource);
    } else {
      other.push(resource);
    }
  }

  return { contracts, other };
}
