/**
 * Lightweight route navigation benchmark for authenticated product surfaces.
 *
 * Usage (dev server on :3000 + authenticated session cookies):
 *   pnpm tsx scripts/benchmark-product-routes.ts
 *
 * Set BENCHMARK_BASE_URL to override (default http://localhost:3000).
 */
const BASE_URL = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  "/hq",
  "/plays",
  "/plays?tab=activity&view=captures",
  "/people",
  "/orgs",
  "/work",
  "/connections",
] as const;

async function measureRoute(path: string): Promise<{ path: string; ms: number; status: number }> {
  const url = `${BASE_URL}${path}`;
  const start = performance.now();
  const response = await fetch(url, {
    redirect: "manual",
    headers: { Accept: "text/html" },
  });
  const ms = Math.round(performance.now() - start);
  return { path, ms, status: response.status };
}

async function main() {
  console.log(`Benchmarking product routes against ${BASE_URL}\n`);
  const results = [];

  for (const path of ROUTES) {
    try {
      const result = await measureRoute(path);
      results.push(result);
      console.log(`${result.path.padEnd(40)} ${String(result.status).padEnd(4)} ${result.ms}ms`);
    } catch (error) {
      console.error(`${path}: failed`, error);
    }
  }

  const sorted = [...results].sort((a, b) => b.ms - a.ms);
  if (sorted.length > 0) {
    console.log(`\nSlowest: ${sorted[0]?.path} (${sorted[0]?.ms}ms)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
