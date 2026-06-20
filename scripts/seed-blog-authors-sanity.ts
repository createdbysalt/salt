/**
 * Seed blog authors in Sanity (Salt Team + Matt Martins).
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-blog-authors
 */
import { createClient, type SanityClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "olt8be01";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

const writeToken =
  process.env.SANITY_API_WRITE_TOKEN ||
  (() => {
    try {
      return readFileSync("/tmp/sanity_wt", "utf8").trim();
    } catch {
      return "";
    }
  })();

if (!writeToken) {
  console.error("Missing SANITY_API_WRITE_TOKEN (or /tmp/sanity_wt)");
  console.error(
    "Usage: op run --env-file=.env.1password -- pnpm content:seed-blog-authors"
  );
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: writeToken,
  apiVersion: "2024-01-01",
  useCdn: false,
});

type AuthorSeed = {
  _id: string;
  name: string;
  slug: string;
  jobTitle: string;
  bio: string;
  imagePath: string;
  social: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
};

const AUTHORS: AuthorSeed[] = [
  {
    _id: "author-marc",
    name: "Salt Team",
    slug: "marc",
    jobTitle: "Building the studio OS",
    bio: "The Salt team is building the operating system for designer-developers who want to run studios, not stay freelancers.",
    imagePath: "app/(public)/learn/_assets/images/authors/marc.png",
    social: {
      twitter: "https://x.com/usesalt.io",
      github: "https://github.com/usesalt",
    },
  },
  {
    _id: "author-matt",
    name: "Matt Martins",
    slug: "matt",
    jobTitle: "CMO at Salt",
    bio: "Matt Martins is the CMO at Salt, focused on helping independent professionals understand how proactive AI transforms business operations.",
    imagePath: "app/(public)/learn/_assets/images/authors/matt-martins.png",
    social: {
      linkedin: "https://linkedin.com/company/usesalt",
      twitter: "https://x.com/usesalt.io",
    },
  },
];

async function uploadAuthorImage(
  sanityClient: SanityClient,
  relativePath: string
): Promise<{ _type: "reference"; _ref: string } | undefined> {
  const absolutePath = path.join(process.cwd(), relativePath);
  const buffer = readFileSync(absolutePath);
  const filename = path.basename(relativePath);

  const asset = await sanityClient.assets.upload("image", buffer, {
    filename,
    contentType: "image/png",
  });

  return { _type: "reference", _ref: asset._id };
}

async function seedAuthor(entry: AuthorSeed) {
  const imageRef = await uploadAuthorImage(client, entry.imagePath);

  await client.createOrReplace({
    _id: entry._id,
    _type: "author",
    name: entry.name,
    slug: { _type: "slug", current: entry.slug },
    jobTitle: entry.jobTitle,
    bio: entry.bio,
    ...(imageRef
      ? {
          image: {
            _type: "image",
            asset: imageRef,
          },
        }
      : {}),
    social: entry.social,
  });

  console.log(`✓ author/${entry.slug} (${entry.name})`);
}

async function main() {
  for (const entry of AUTHORS) {
    await seedAuthor(entry);
  }
  console.log(`\nSeeded ${AUTHORS.length} blog authors in ${DATASET}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
