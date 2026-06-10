import "server-only";

/** Mock content disabled — server routes should not gate on demo fixtures. */
export async function isMockContentEnabledForUser(): Promise<boolean> {
  return false;
}
