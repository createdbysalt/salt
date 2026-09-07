/**
 * Back-compat re-export — the gate lifted to app/_lib/admin/platform-admin.ts
 * when the /admin hub became its second consumer. New code imports from
 * `@/app/_lib/admin/platform-admin`.
 */
export { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
