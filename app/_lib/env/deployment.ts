/**
 * Resolves the deployment environment for hosted and local runs.
 *
 * Prefer explicit NEXT_PUBLIC_DEPLOYMENT_ENV per Vercel branch.
 * Falls back to VERCEL_ENV + VERCEL_GIT_COMMIT_REF when unset.
 */

export type DeploymentEnvironment = "production" | "staging" | "development";

const VALID_ENVS: DeploymentEnvironment[] = [
  "production",
  "staging",
  "development",
];

function parseExplicitEnv(
  value: string | undefined
): DeploymentEnvironment | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (VALID_ENVS.includes(normalized as DeploymentEnvironment)) {
    return normalized as DeploymentEnvironment;
  }
  return null;
}

/**
 * Server and client safe when NEXT_PUBLIC_DEPLOYMENT_ENV is set.
 * On server, also considers VERCEL_* when explicit env is missing.
 */
export function getDeploymentEnvironment(): DeploymentEnvironment {
  const explicit =
    parseExplicitEnv(process.env.NEXT_PUBLIC_DEPLOYMENT_ENV) ??
    parseExplicitEnv(process.env.DEPLOYMENT_ENV);

  if (explicit) return explicit;

  const vercelEnv = process.env.VERCEL_ENV;
  const ref = process.env.VERCEL_GIT_COMMIT_REF;

  if (vercelEnv === "production") return "production";
  if (ref === "staging") return "staging";

  return "development";
}

export function isStagingDeployment(): boolean {
  return getDeploymentEnvironment() === "staging";
}

export function isProductionDeployment(): boolean {
  return getDeploymentEnvironment() === "production";
}
