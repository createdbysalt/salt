# Next.js 15 Patterns

**Context:** Salt uses Next.js 15.4+ with App Router. These patterns are **mandatory** to avoid runtime errors.

## Critical Changes from Next.js 14

### 1. Async APIs - ALWAYS Use Await

All Next.js APIs that access request data are now async:

```typescript
// ❌ WRONG (Next.js 14 style)
const headersList = headers();
const cookieStore = cookies();
const { id } = params;

// ✅ CORRECT (Next.js 15 style)
const headersList = await headers();
const cookieStore = await cookies();
const { id } = await params;
```

### 2. Dynamic Route Params Are Promises

```typescript
// ❌ WRONG
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id;
}

// ✅ CORRECT
export default async function Page({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
}

// Also applies to generateMetadata
export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
}
```

### 3. Search Params Are Promises

```typescript
// ❌ WRONG
export default function Page({
  searchParams
}: {
  searchParams: { [key: string]: string }
}) {
  const query = searchParams.q;
}

// ✅ CORRECT
export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string }>
}) {
  const { q: query } = await searchParams;
}
```

## Component Patterns

### Server Components (Default)

```typescript
// No "use client" directive = Server Component
import { Metadata } from "next";
import { createClient } from "@/app/_lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Studio management dashboard",
};

export default async function DashboardPage() {
  // Can use async/await
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Can fetch data directly
  const { data: studios } = await supabase
    .from("studios")
    .select("*")
    .single();

  return <div>Server-rendered content</div>;
}
```

### Client Components (When Needed)

Use client components ONLY for:
- User interactions (onClick, onChange)
- Browser APIs (window, document)
- React hooks (useState, useEffect)
- Real-time updates

```typescript
"use client"; // Required directive

import { useState, useEffect } from "react";
import { createClient } from "@/app/_lib/supabase/client";

export default function InteractiveComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient(); // No await for client

  const handleClick = async () => {
    setIsLoading(true);
    // Handle user interaction
    setIsLoading(false);
  };

  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isLoading ? "Loading..." : "Click me"}
    </button>
  );
}
```

## API Route Patterns

### Basic Structure

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/_lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient(); // Always await

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Your logic here
    return NextResponse.json({ data: result });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Webhook Handler Pattern

```typescript
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers(); // Must await!
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  // Verify webhook and process
}
```

## Data Fetching Patterns

### Server Component Data Fetching

```typescript
// ✅ PREFERRED: Fetch in Server Component
export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error; // Will be caught by error.tsx
  }

  return <ProductList products={products} />;
}
```

### Loading States

```typescript
// app/(product)/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  );
}
```

### Error Boundaries

```typescript
// app/(product)/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="text-center py-10">
      <h2 className="text-xl font-semibold mb-2">Something went wrong!</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded"
      >
        Try again
      </button>
    </div>
  );
}
```

## Common Build Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot read properties of undefined" | Missing await on params/headers | Add `await` to all Next.js async APIs |
| "Headers can only be accessed in Server Components" | Using headers() in client component | Move to server component or API route |
| "Promises must be awaited" | TypeScript error on params | Update type to `Promise<{...}>` and await |
| "Invalid hook call" | Using hooks in server component | Add "use client" directive |

## Migration Checklist

When upgrading from Next.js 14:

- [ ] Update all `params` to `Promise<{...}>` type
- [ ] Add `await` to all `params` destructuring
- [ ] Add `await` to all `headers()` calls
- [ ] Add `await` to all `cookies()` calls
- [ ] Update `searchParams` to Promise type
- [ ] Add `await` to `createClient()` in server contexts
- [ ] Test all dynamic routes
- [ ] Run `pnpm build` to catch type errors