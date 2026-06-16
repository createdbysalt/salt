/**
 * Download competitor marks via Brandfetch Brand API and save to public/compare/logos/.
 * Priority: icon → symbol → logo. Format: SVG preferred, then PNG.
 * Theme: light (color/black on light cards), then unthemed, then dark.
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm sync-compare-logos
 */
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public/compare/logos");

const apiKey = process.env.BRANDFETCH_API_KEY;

type CompetitorSeed = {
  slug: string;
  domains: string[];
};

const COMPETITORS: CompetitorSeed[] = [
  { slug: "salt", domains: ["usesalt.io"] },
  { slug: "lindy", domains: ["lindy.ai"] },
  { slug: "viktor", domains: ["viktor.com", "getviktor.com"] },
  { slug: "chatgpt", domains: ["openai.com"] },
  { slug: "zapier", domains: ["zapier.com"] },
  { slug: "make", domains: ["make.com"] },
  { slug: "honeybook", domains: ["honeybook.com"] },
  { slug: "dubsado", domains: ["dubsado.com"] },
  { slug: "17hats", domains: ["17hats.com"] },
];

const TYPE_PRIORITY = ["symbol", "logo", "icon"] as const;
const THEME_PRIORITY = ["light", null, "dark"] as const;
const FORMAT_PRIORITY = ["svg", "png", "webp", "jpeg", "jpg"] as const;

type BrandLogoFormat = {
  src: string;
  format?: string;
  width?: number;
  height?: number;
};

type BrandLogo = {
  type?: string;
  theme?: string | null;
  formats?: BrandLogoFormat[];
};

type BrandResponse = {
  logos?: BrandLogo[];
};

function extensionForFormat(format: string | undefined): string {
  if (!format) return "png";
  if (format.includes("svg")) return "svg";
  if (format.includes("webp")) return "webp";
  if (format.includes("jpeg") || format.includes("jpg")) return "jpg";
  return "png";
}

function pickFormat(formats: BrandLogoFormat[]): BrandLogoFormat | null {
  for (const preferred of FORMAT_PRIORITY) {
    const match = formats.find((f) => f.format === preferred);
    if (match) {
      return match;
    }
  }
  return formats[0] ?? null;
}

function pickMarkFromBrand(logos: BrandLogo[]): {
  src: string;
  type: string;
  format: string;
} | null {
  for (const type of TYPE_PRIORITY) {
    for (const theme of THEME_PRIORITY) {
      const match = logos.find(
        (logo) =>
          logo.type === type &&
          (theme === null ? logo.theme == null : logo.theme === theme)
      );

      if (!match?.formats?.length) {
        continue;
      }

      const format = pickFormat(match.formats);
      if (format?.src) {
        return {
          src: format.src,
          type,
          format: format.format ?? "png",
        };
      }
    }
  }

  return null;
}

async function fetchBrand(domain: string): Promise<BrandResponse> {
  const res = await fetch(
    `https://api.brandfetch.io/v2/brands/domain/${encodeURIComponent(domain)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brand API ${res.status} for ${domain}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as BrandResponse;
}

async function downloadAsset(src: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(src);
  if (!res.ok) {
    throw new Error(`Asset HTTP ${res.status} (${src})`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isImage =
    contentType.startsWith("image/") || contentType.includes("svg");
  if (!isImage) {
    throw new Error(`Expected image/*, got ${contentType || "unknown"} (${src})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

async function resolveMark(
  domains: string[]
): Promise<{ domain: string; src: string; type: string; format: string }> {
  let lastError: Error | undefined;

  for (const domain of domains) {
    try {
      const brand = await fetchBrand(domain);
      const mark = pickMarkFromBrand(brand.logos ?? []);
      if (mark) {
        return { domain, ...mark };
      }
      lastError = new Error(`No icon/symbol/logo asset for ${domain}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("No domains configured");
}

function removeStaleAssets(slug: string, keepExt: string) {
  for (const ext of ["png", "svg", "webp", "jpg", "ico"]) {
    if (ext === keepExt) continue;
    try {
      unlinkSync(join(outDir, `${slug}.${ext}`));
    } catch {
      // ignore missing files
    }
  }
}

/** When Brand API quota is exhausted, still seed committed marks. */
const SIMPLE_ICON_SLUGS: Partial<Record<string, string>> = {
  zapier: "zapier",
  make: "make",
};

const REPO_MARKS: Partial<Record<string, string>> = {
  salt: join(root, "public/landing/salt-icon.svg"),
};

/** Transparent vector marks when Brand API / simpleicons are unavailable. */
const REMOTE_SVG_MARKS: Partial<Record<string, string>> = {
  chatgpt:
    "https://cdn.jsdelivr.net/gh/callback-io/allogo@main/public/logos/openai/icon.svg",
  viktor: "https://viktor.com/assets/brand/logos/viktor-logo-color.svg",
};

async function fetchSimpleIconSvg(slug: string): Promise<Buffer> {
  const res = await fetch(`https://cdn.simpleicons.org/${slug}`);
  if (!res.ok) {
    throw new Error(`simpleicons ${slug} HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text.includes("<svg")) {
    throw new Error(`simpleicons ${slug} did not return SVG`);
  }
  return Buffer.from(text, "utf8");
}

async function fetchGoogleFavicon(domain: string): Promise<{ buffer: Buffer; ext: string }> {
  const res = await fetch(
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
  );
  if (!res.ok) {
    throw new Error(`Google favicon HTTP ${res.status} for ${domain}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = contentType.includes("jpeg") ? "jpg" : "png";
  return { buffer, ext };
}

async function fetchSiteFavicon(domain: string): Promise<{ buffer: Buffer; ext: string }> {
  const res = await fetch(`https://${domain}/favicon.ico`, {
    headers: { "User-Agent": "SaltCompareLogoSync/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Site favicon HTTP ${res.status} for ${domain}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, ext: "ico" };
}

async function resolveMarkWithFallbacks(
  competitor: CompetitorSeed
): Promise<{ src: string; type: string; format: string; buffer: Buffer }> {
  if (apiKey) {
    try {
      const mark = await resolveMark(competitor.domains);
      const { buffer, contentType } = await downloadAsset(mark.src);
      const format = mark.format || contentType.split("/")[1] || "png";
      return { ...mark, format, buffer };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429") && !message.includes("quota")) {
        process.stderr.write(`  Brand API skipped (${message})\n`);
      }
    }
  }

  const repoPath = REPO_MARKS[competitor.slug];
  if (repoPath) {
    const buffer = readFileSync(repoPath);
    return {
      src: repoPath,
      type: "icon",
      format: "svg",
      buffer,
    };
  }

  const simpleSlug = SIMPLE_ICON_SLUGS[competitor.slug];
  if (simpleSlug) {
    const buffer = await fetchSimpleIconSvg(simpleSlug);
    return {
      src: `https://cdn.simpleicons.org/${simpleSlug}`,
      type: "symbol",
      format: "svg",
      buffer,
    };
  }

  const remoteSvg = REMOTE_SVG_MARKS[competitor.slug];
  if (remoteSvg) {
    const { buffer, contentType } = await downloadAsset(remoteSvg);
    if (!contentType.includes("svg") && !buffer.toString("utf8").includes("<svg")) {
      throw new Error(`Expected SVG from ${remoteSvg}`);
    }
    return {
      src: remoteSvg,
      type: "symbol",
      format: "svg",
      buffer,
    };
  }

  for (const domain of competitor.domains) {
    try {
      const { buffer, ext } = await fetchSiteFavicon(domain);
      return {
        src: `https://${domain}/favicon.ico`,
        type: "icon",
        format: ext,
        buffer,
      };
    } catch {
      // try next domain / google
    }

    try {
      const { buffer, ext } = await fetchGoogleFavicon(domain);
      return {
        src: `google-favicon:${domain}`,
        type: "icon",
        format: ext,
        buffer,
      };
    } catch {
      // try next domain
    }
  }

  throw new Error("No Brand API, simpleicons, or favicon source available");
}

async function main() {
  mkdirSync(outDir, { recursive: true });

  const manifest: Record<
    string,
    {
      domain: string;
      localLogo: string;
      assetSrc: string;
      markType: string;
      format: string;
    }
  > = {};

  for (const competitor of COMPETITORS) {
    process.stdout.write(`Fetching ${competitor.slug} (${competitor.domains.join(", ")})… `);
    try {
      const mark = await resolveMarkWithFallbacks(competitor);
      const ext = extensionForFormat(mark.format);
      const filename = `${competitor.slug}.${ext}`;
      const filePath = join(outDir, filename);
      writeFileSync(filePath, mark.buffer);
      removeStaleAssets(competitor.slug, ext);

      const localLogo = `/compare/logos/${filename}`;
      manifest[competitor.slug] = {
        domain: competitor.domains[0] ?? "",
        localLogo,
        assetSrc: mark.src,
        markType: mark.type,
        format: mark.format,
      };
      console.log(`ok → ${localLogo} (${mark.type}/${mark.format})`);
    } catch (error) {
      console.log("failed");
      console.error(`  ${error instanceof Error ? error.message : error}`);
    }
  }

  writeFileSync(
    join(root, "public/compare/competitors-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  console.log("\nWrote public/compare/competitors-manifest.json");
}

main();
