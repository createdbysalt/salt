# 📦 Shared Library Protocol

**Context:** You are working in the `packages/` workspace.
**Role:** Library Maintainer.
**Goal:** Create reusable, stateless, and type-safe modules for `app/` to consume.

## 1. 🚧 The "Library" Laws

Violating these rules breaks the monorepo dependency graph.

1. **Zero App Imports:**
   * NEVER import from `app/*`. Packages must be agnostic of the implementation details of the frontend or backend.
   * Why? Circular dependencies will crash Turborepo.

2. **The "Barrel" Export Pattern:**
   * Every package MUST have a `src/index.ts` (and optionally `src/client.ts` / `src/server.ts`).
   * Consumers (apps) should import from the package name (e.g., `import { Button } from "@repo/ui"`), NOT deep paths (e.g., `@repo/ui/src/button`).
   * Action: Ensure `package.json` defines strict `exports`.

3. **Raw TypeScript:**
   * We do not pre-build packages with `tsc` or `rollup` (unless publishing to npm).
   * Apps consume raw `.ts` files via Next.js `transpilePackages`.
   * Constraint: Do not add complex build scripts to packages unless explicitly asked.

## 2. 🏗️ Standard Package Structure

All new packages must follow this layout:

```
packages/my-pkg/
├── package.json   # name: "@repo/my-pkg"
├── tsconfig.json  # extends: "../../tsconfig.base.json"
└── src/
    ├── index.ts   # Public API
    ├── lib/       # Internal logic
    └── tests/     # Vitest unit tests
```

## 3. 🧪 Testing Strategy

Packages require high confidence because they break everything if they fail.

* **Runner:** Vitest.
* **Scope:** Unit tests only. No E2E here.
* **Command:** `pnpm test` (must run fast).
* **Mocking:** Use `vi.mock` freely. Packages should not rely on a running database.

## 4. 📦 Dependency Management

* **Adding Deps:** `pnpm add <dep> --filter @repo/<pkg-name>`
* **Peer Dependencies:** If a package uses React, list `react` as a `peerDependency`, not a `dependency`.

## 5. 📚 Known Packages (The Inventory)

* `@repo/shared-types`: Zod schemas & TypeScript types. (Most critical)
* `@repo/ui`: Shadcn components & Tailwind config.
* `@repo/db`: Prisma/Drizzle schema and client singleton.
* `@repo/auth`: Shared Auth logic/utilities.

---

## Why this file maximizes velocity:

1. **Prevents Build Hell:** By explicitly telling Claude "We consume raw TypeScript," you stop it from trying to configure complex Rollup/Webpack build steps for every tiny utility package.
2. **Enforces Encapsulation:** The "Barrel Export" rule forces the AI to think about the Public API of a package, rather than just grabbing random files.
3. **Dependency Hygiene:** Reminding the AI to use `--filter` ensures it installs packages in the right place, preventing "Phantom Dependencies" in the root.