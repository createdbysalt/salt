import type { ExistingPersonCandidate, RecordsInput } from "./types";

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizedName(value: string | null | undefined): string {
  return normalize(value).replace(/\s+/g, " ");
}

export function resolveIdentity(input: {
  recordsInput: RecordsInput;
  candidates: ExistingPersonCandidate[];
}): ExistingPersonCandidate[] {
  const email = normalize(input.recordsInput.email);
  const name = normalizedName(input.recordsInput.name);
  const domain = normalize(input.recordsInput.domain);
  const orgName = normalizedName(input.recordsInput.organizationName);

  if (email) {
    const exact = input.candidates.find((candidate) => normalize(candidate.email) === email);
    if (exact) return [exact];
  }

  if (!name) return [];

  return input.candidates.filter((candidate) => {
    if (normalizedName(candidate.name) !== name) return false;
    if (email && candidate.email && normalize(candidate.email) !== email) return true;
    const candidateDomain = normalize(candidate.organizationDomain);
    const candidateOrg = normalizedName(candidate.organizationName);

    if (domain && candidateDomain && domain !== candidateDomain) return true;
    if (orgName && candidateOrg && orgName !== candidateOrg) return true;
    if (!email && candidate.email) return true;

    return false;
  });
}
