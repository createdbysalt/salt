# Coding Conventions

**Context:** Coding standards and conventions for SALT development.

## TypeScript Standards

### Type Safety

```typescript
// ✅ Use strict TypeScript with proper typing
interface UserProfile {
  id: string;
  email: string;
  name?: string; // Optional properties marked
  role: UserRole; // Use enums/unions for constraints
}

// ✅ Prefer interface over type for objects
interface ProjectData {
  id: string;
  name: string;
}

// ❌ Avoid using 'any'
const data: any = fetchData(); // Bad

// ✅ Use unknown and type guards
const data: unknown = fetchData();
if (isProjectData(data)) {
  // Now TypeScript knows the type
}
```

### Import Patterns

```typescript
// ✅ Use type imports when possible
import type { NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

// ✅ Order imports consistently
// 1. React and Next.js
import { useState } from "react";
import { NextResponse } from "next/server";

// 2. Third-party libraries
import { z } from "zod";
import { toast } from "react-hot-toast";

// 3. Internal components
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/UserProfile";

// 4. Internal utilities
import { createClient } from "@/libs/supabase/server";
import { hasStudioAccess } from "@/libs/permissions/checks";

// 5. Types
import type { Studio, Project } from "@/types/database";

// 6. Config and constants
import { STUDIO_ROLES } from "@/config/constants";

// 7. Relative imports (same folder only)
import { helper } from "./helper";
```

## File Naming

### Components

```typescript
// ✅ Component files: PascalCase
UserProfile.tsx
ButtonCheckout.tsx
LayoutDashboard.tsx

// ✅ Component exports match filename
export default function UserProfile() { }

// ❌ Don't use index.tsx for components
components/UserProfile/index.tsx // Bad
components/UserProfile.tsx // Good
```

### Other Files

```typescript
// ✅ Libraries and utilities: kebab-case
stripe-connect.ts
calendar-encryption.ts
user-dashboard.ts

// ✅ Types: kebab-case or match source
types/database.ts
types/stripe.ts

// ✅ API routes: kebab-case folders
app/api/create-checkout/route.ts
app/api/stripe-webhook/route.ts
```

## Component Patterns

### Server Components (Default)

```typescript
// No "use client" directive = Server Component
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

// ✅ Async by default for data fetching
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("studios").select("*");

  return <div>{/* Server-rendered content */}</div>;
}
```

### Client Components

```typescript
"use client"; // Required directive

// ❌ Don't use client components unnecessarily
// Only when you need:
// - useState, useEffect, other hooks
// - onClick, onChange handlers
// - Browser APIs (window, document)
// - Third-party client libraries

export default function InteractiveForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return <form>{/* Interactive elements */}</form>;
}
```

### Props Interfaces

```typescript
// ✅ Always define props interfaces
interface UserCardProps {
  user: User;
  onEdit?: (id: string) => void;
  className?: string;
}

export function UserCard({ user, onEdit, className }: UserCardProps) {
  return <div className={className}>{/* Component */}</div>;
}

// ✅ Use proper generic types for reusable components
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

export function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return <>{items.map(item => (
    <div key={keyExtractor(item)}>{renderItem(item)}</div>
  ))}</>;
}
```

## API Route Patterns

### Structure

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ✅ Define request schema
const RequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

// ✅ Use proper HTTP methods
export async function POST(req: NextRequest) {
  try {
    // 1. Validate request body
    const body = await req.json();
    const validated = RequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // 2. Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 3. Business logic
    const result = await processRequest(validated.data);

    // 4. Return consistent response
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

## Database Patterns

### Naming Conventions

```sql
-- ✅ Tables: snake_case, plural
CREATE TABLE studio_members ( );

-- ✅ Columns: snake_case
id UUID PRIMARY KEY,
created_at TIMESTAMPTZ,
is_active BOOLEAN

-- ✅ Foreign keys: table_id
studio_id UUID REFERENCES studios(id),
user_id UUID REFERENCES auth.users(id)

-- ✅ Indexes: idx_table_columns
CREATE INDEX idx_projects_studio_id ON projects(studio_id);
```

### Query Patterns

```typescript
// ✅ Always handle errors
const { data, error } = await supabase
  .from("studios")
  .select("*")
  .eq("id", studioId)
  .single();

if (error) {
  console.error("Query failed:", error);
  throw new Error("Failed to fetch studio");
}

// ✅ Use proper types
const { data } = await supabase
  .from("studios")
  .select("*")
  .returns<Studio[]>(); // Type assertion

// ✅ Scope queries to tenant
const { data } = await supabase
  .from("projects")
  .select("*, client:clients(*)")
  .eq("studio_id", context.studioId);
```

## Error Handling

### API Routes

```typescript
// ✅ Specific error responses
try {
  // Operation
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.issues },
      { status: 400 }
    );
  }

  if (error.code === "23505") {
    return NextResponse.json(
      { error: "Resource already exists" },
      { status: 409 }
    );
  }

  // Generic fallback
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

### Client Components

```typescript
// ✅ User-friendly error handling
const handleSubmit = async () => {
  try {
    setIsLoading(true);
    await submitForm(data);
    toast.success("Saved successfully!");
    router.refresh();
  } catch (error) {
    // Log for debugging
    console.error("Submit failed:", error);

    // Show user-friendly message
    toast.error(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."
    );
  } finally {
    setIsLoading(false);
  }
};
```

## Code Organization

### Feature-Based Structure

```typescript
// Group related code by feature
components/
  features/
    billing/
      CheckoutButton.tsx
      PricingCard.tsx
      SubscriptionStatus.tsx
    projects/
      ProjectCard.tsx
      ProjectList.tsx
      CreateProjectModal.tsx
```

### Single Responsibility

```typescript
// ❌ Component doing too much
export function ProjectPage() {
  // Fetching data
  // Managing form state
  // Handling submissions
  // Rendering UI
  // Managing modals
  // 500+ lines of code
}

// ✅ Split into focused components
export function ProjectPage() {
  return (
    <>
      <ProjectHeader />
      <ProjectList />
      <CreateProjectButton />
    </>
  );
}
```

## Comments and Documentation

### When to Comment

```typescript
// ✅ Complex business logic
// Calculate the studio's monthly recurring revenue
// including all active subscriptions and add-ons
const mrr = calculateStudioMRR(studio);

// ✅ Non-obvious code
// We use a 5-minute cache to prevent rate limiting
// while still showing relatively fresh data
const CACHE_DURATION = 5 * 60 * 1000;

// ❌ Obvious comments
// Set loading to true
setIsLoading(true);
```

### JSDoc for Utilities

```typescript
/**
 * Validates that a user has access to a specific studio
 * @param userId - The user's ID from auth
 * @param studioId - The studio to check access for
 * @param requiredRoles - Optional array of roles needed
 * @returns Promise<boolean> - True if user has access
 */
export async function hasStudioAccess(
  userId: string,
  studioId: string,
  requiredRoles?: StudioRole[]
): Promise<boolean> {
  // Implementation
}
```

## Performance Patterns

### Component Optimization

```typescript
// ✅ Use server components by default
// Client components only when needed

// ✅ Lazy load heavy components
const HeavyChart = dynamic(() => import("./HeavyChart"), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

// ✅ Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateComplexValue(data);
}, [data]);
```

### Image Optimization

```typescript
// ✅ Always use Next.js Image
import Image from "next/image";

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // For above-fold images
/>

// ✅ Configure remote patterns
// next.config.js
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
    },
  ],
}
```

## Testing Patterns

### Naming Conventions

```typescript
// Test files
UserProfile.test.tsx
stripe-connect.test.ts

// Test descriptions
describe('UserProfile', () => {
  it('should display user email', () => {
    // Test implementation
  });

  it('should handle missing name gracefully', () => {
    // Test implementation
  });
});
```

## Git Commit Messages

Use Conventional Commits:

```bash
feat: add user authentication
fix: resolve stripe webhook timeout
docs: update API documentation
style: format code with prettier
refactor: extract billing logic to separate module
test: add tests for user service
chore: update dependencies
```

## Code Review Checklist

Before submitting PR:
- [ ] TypeScript compiles without errors
- [ ] No `any` types unless justified
- [ ] Proper error handling in place
- [ ] Loading and error states handled
- [ ] Database queries are tenant-scoped
- [ ] No hardcoded values (use constants/env)
- [ ] Components follow naming conventions
- [ ] Imports are properly ordered
- [ ] No console.logs in production code
- [ ] Tests pass (if applicable)