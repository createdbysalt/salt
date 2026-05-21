# Supabase Patterns

**Context:** Salt uses Supabase for authentication, database, and real-time features. Client creation differs between server and client contexts.

## Client Creation Patterns

### Server Components & API Routes

```typescript
import { createClient } from "@/libs/supabase/server";

// Always await in Next.js 15
const supabase = await createClient();
```

### Client Components

```typescript
"use client";
import { createClient } from "@/libs/supabase/client";

// No await for client-side
const supabase = createClient();
```

### Admin Operations

```typescript
import { createAdminClient } from "@/libs/supabase/admin";

// For service-role operations only
const supabase = createAdminClient();
```

## Authentication Patterns

### Check Authentication (Server)

```typescript
import { createClient } from "@/libs/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/signin");
  }

  // User is authenticated
  return <div>Protected content for {user.email}</div>;
}
```

### Check Authentication (API Route)

```typescript
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Continue with authenticated logic
}
```

### Sign In Flow

```typescript
"use client";

export function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      toast.error("Failed to sign in");
    }
    setIsLoading(false);
  };

  return (
    <button onClick={handleGoogleSignIn} disabled={isLoading}>
      Sign in with Google
    </button>
  );
}
```

### Sign Out Flow

```typescript
"use client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh(); // Important: refresh server components
  };

  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

## Database Query Patterns

### Basic Queries with RLS

```typescript
// RLS automatically filters based on auth.uid()
const { data: studios, error } = await supabase
  .from("studios")
  .select("*")
  .order("created_at", { ascending: false });

if (error) {
  console.error("Query error:", error);
  throw error;
}
```

### Joins and Relations

```typescript
// Get studios with member count
const { data: studios } = await supabase
  .from("studios")
  .select(`
    *,
    studio_members!inner(count)
  `);

// Get projects with client and studio data
const { data: projects } = await supabase
  .from("projects")
  .select(`
    *,
    studio:studios(name, slug),
    client:clients(name, email)
  `)
  .eq("status", "active");
```

### Insert with Return

```typescript
const { data: newStudio, error } = await supabase
  .from("studios")
  .insert({
    name: "Design Studio",
    slug: "design-studio",
    owner_id: user.id,
  })
  .select()
  .single();

if (error) {
  if (error.code === "23505") {
    // Unique constraint violation
    throw new Error("Studio slug already exists");
  }
  throw error;
}
```

### Update Operations

```typescript
const { error } = await supabase
  .from("studios")
  .update({
    name: "Updated Studio Name",
    updated_at: new Date().toISOString(),
  })
  .eq("id", studioId)
  .eq("owner_id", user.id); // Extra safety check

if (error) {
  console.error("Update failed:", error);
  throw error;
}
```

### Upsert Pattern

```typescript
const { data, error } = await supabase
  .from("user_preferences")
  .upsert({
    user_id: user.id,
    theme: "dark",
    notifications_enabled: true,
  }, {
    onConflict: "user_id",
  })
  .select()
  .single();
```

## Row Level Security (RLS) Patterns

### Common RLS Policies

```sql
-- Studios: Users can only see studios they're members of
CREATE POLICY "Users can view studios they are members of"
ON studios FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM studio_members
    WHERE studio_members.studio_id = studios.id
    AND studio_members.user_id = auth.uid()
  )
);

-- Projects: Check studio membership OR client user access
CREATE POLICY "Users can view projects"
ON projects FOR SELECT
TO authenticated
USING (
  -- Studio member access
  EXISTS (
    SELECT 1 FROM studio_members
    WHERE studio_members.studio_id = projects.studio_id
    AND studio_members.user_id = auth.uid()
  ) OR
  -- Client user access
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = projects.client_id
    AND client_users.user_id = auth.uid()
  )
);
```

### Bypassing RLS (Admin Only)

```typescript
// Only use in server-side admin operations
import { createAdminClient } from "@/libs/supabase/admin";

const supabase = createAdminClient();

// This bypasses RLS - use carefully!
const { data: allStudios } = await supabase
  .from("studios")
  .select("*");
```

## Real-time Subscriptions

```typescript
"use client";

export function RealtimeProjects({ studioId }: { studioId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial load
    const loadProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("studio_id", studioId);

      if (data) setProjects(data);
    };

    loadProjects();

    // Subscribe to changes
    const subscription = supabase
      .channel(`projects:${studioId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "projects",
          filter: `studio_id=eq.${studioId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setProjects(prev => [...prev, payload.new as Project]);
          } else if (payload.eventType === "UPDATE") {
            setProjects(prev =>
              prev.map(p =>
                p.id === payload.new.id ? payload.new as Project : p
              )
            );
          } else if (payload.eventType === "DELETE") {
            setProjects(prev =>
              prev.filter(p => p.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [studioId]);

  return <ProjectList projects={projects} />;
}
```

## Error Handling Patterns

### Database Errors

```typescript
try {
  const { data, error } = await supabase
    .from("studios")
    .insert({ name, slug });

  if (error) {
    // Handle specific Postgres errors
    switch (error.code) {
      case "23505": // unique_violation
        throw new Error("This slug is already taken");
      case "23503": // foreign_key_violation
        throw new Error("Invalid reference");
      case "42501": // insufficient_privilege
        throw new Error("You don't have permission");
      default:
        throw error;
    }
  }
} catch (error) {
  // Handle in UI
  toast.error(error.message);
}
```

### Auth Errors

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  switch (error.message) {
    case "Invalid login credentials":
      setError("Email or password is incorrect");
      break;
    case "Email not confirmed":
      setError("Please check your email to confirm your account");
      break;
    default:
      setError("An error occurred during sign in");
  }
}
```

## Best Practices

1. **Always handle errors** - Supabase doesn't throw, it returns `{ data, error }`
2. **Use TypeScript types** - Generate types with `supabase gen types`
3. **Leverage RLS** - Let the database handle authorization
4. **Avoid N+1 queries** - Use joins instead of multiple queries
5. **Clean up subscriptions** - Always unsubscribe in useEffect cleanup
6. **Use transactions** - For multi-table operations that must succeed together
7. **Cache user sessions** - Don't call `getUser()` multiple times per request