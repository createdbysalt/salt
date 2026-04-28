# Error Handling Patterns

**Context:** Comprehensive error handling strategies for SALT applications.

## Error Handling Philosophy

1. **Fail gracefully** - Never crash the application
2. **Inform users** - Clear, actionable error messages
3. **Log details** - Full error context for debugging
4. **Recover when possible** - Offer retry or fallback options

## API Route Error Handling

### Standard Error Response Format

```typescript
interface ErrorResponse {
  error: string;           // User-facing message
  code?: string;          // Error code (e.g., "INVALID_INPUT")
  details?: any;          // Additional context
  timestamp?: string;     // When error occurred
  requestId?: string;     // For tracking
}
```

### Complete API Route Pattern

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/libs/supabase/server";

// Define expected errors
class ValidationError extends Error {
  constructor(public issues: z.ZodIssue[]) {
    super("Validation failed");
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // 1. Parse and validate input
    const body = await req.json();
    const schema = z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
    });

    const validated = schema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError(validated.error.issues);
    }

    // 2. Authentication check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthorizationError("Authentication required");
    }

    // 3. Authorization check
    const hasAccess = await checkUserPermissions(user.id);
    if (!hasAccess) {
      throw new AuthorizationError("Insufficient permissions");
    }

    // 4. Business logic with database error handling
    const { data, error: dbError } = await supabase
      .from("resources")
      .insert(validated.data)
      .select()
      .single();

    if (dbError) {
      // Handle specific database errors
      switch (dbError.code) {
        case "23505": // unique_violation
          return NextResponse.json(
            {
              error: "A resource with this name already exists",
              code: "DUPLICATE_RESOURCE",
            },
            { status: 409 }
          );
        case "23503": // foreign_key_violation
          return NextResponse.json(
            {
              error: "Invalid reference provided",
              code: "INVALID_REFERENCE",
            },
            { status: 400 }
          );
        default:
          throw dbError;
      }
    }

    // 5. Success response
    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    // Log error with context
    console.error(`[${requestId}] API Error:`, {
      error,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: "Invalid input provided",
          code: "VALIDATION_ERROR",
          details: error.issues,
          requestId,
        },
        { status: 400 }
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "AUTHORIZATION_ERROR",
          requestId,
        },
        { status: 403 }
      );
    }

    // Rate limiting
    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          requestId,
        },
        { status: 429 }
      );
    }

    // Generic error fallback
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        code: "INTERNAL_ERROR",
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
```

## Client-Side Error Handling

### API Call Pattern

```typescript
"use client";

import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

async function callApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw {
      status: response.status,
      ...data,
    };
  }

  return data;
}

export function useApiCall() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const execute = async <T>(
    apiCall: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (data: T) => void;
      onError?: (error: ApiError) => void;
    }
  ) => {
    setIsLoading(true);

    try {
      const result = await apiCall();

      if (options?.successMessage) {
        toast.success(options.successMessage);
      }

      options?.onSuccess?.(result);

      return result;

    } catch (error: any) {
      console.error("API call failed:", error);

      // Handle specific error codes
      switch (error.code) {
        case "VALIDATION_ERROR":
          toast.error(
            options?.errorMessage ||
            "Please check your input and try again."
          );
          break;

        case "AUTHORIZATION_ERROR":
          toast.error("You don't have permission to do that.");
          router.push("/dashboard");
          break;

        case "RATE_LIMIT_EXCEEDED":
          toast.error("Too many requests. Please wait a moment.");
          break;

        case "DUPLICATE_RESOURCE":
          toast.error("That name is already taken. Please choose another.");
          break;

        default:
          toast.error(
            options?.errorMessage ||
            error.error ||
            "Something went wrong. Please try again."
          );
      }

      options?.onError?.(error);
      throw error;

    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading };
}
```

### Form Error Handling

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const FormSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(18, "Must be at least 18 years old"),
});

export function UserForm() {
  const { execute } = useApiCall();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(FormSchema),
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      await execute(
        () => callApi("/api/users", {
          method: "POST",
          body: JSON.stringify(data),
        }),
        {
          successMessage: "User created successfully!",
          onSuccess: () => router.push("/users"),
        }
      );
    } catch (error: any) {
      // Set field-specific errors from server
      if (error.details?.fieldErrors) {
        Object.entries(error.details.fieldErrors).forEach(
          ([field, message]) => {
            setError(field as any, { message: message as string });
          }
        );
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("email")}
        className={errors.email ? "border-red-500" : ""}
      />
      {errors.email && (
        <span className="text-red-500 text-sm">{errors.email.message}</span>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

## Supabase Error Handling

### Database Operations

```typescript
export async function getStudioProjects(studioId: string) {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("projects")
    .select("*, client:clients(name, email)", { count: "exact" })
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });

  if (error) {
    // Log with context
    console.error("Failed to fetch projects:", {
      error,
      studioId,
      code: error.code,
      message: error.message,
    });

    // Handle specific Supabase errors
    switch (error.code) {
      case "PGRST116": // No rows returned
        return { data: [], count: 0 };

      case "42501": // Insufficient privilege (RLS)
        throw new Error("Access denied to studio projects");

      case "PGRST301": // Limit/offset out of range
        throw new Error("Invalid pagination parameters");

      default:
        throw new Error(`Database error: ${error.message}`);
    }
  }

  return { data: data || [], count: count || 0 };
}
```

### Auth Error Handling

```typescript
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // User-friendly auth error messages
    const errorMessages: Record<string, string> = {
      "Invalid login credentials": "Email or password is incorrect",
      "Email not confirmed": "Please check your email to confirm your account",
      "User already registered": "An account with this email already exists",
      "Password should be at least 6 characters": "Password is too short",
    };

    throw new Error(
      errorMessages[error.message] ||
      "Authentication failed. Please try again."
    );
  }

  return data;
}
```

## Error Boundaries

### Page-Level Error Boundary

```typescript
// app/dashboard/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Dashboard error:", error);

    // Could send to Sentry, LogRocket, etc.
    if (typeof window !== "undefined" && window.Sentry) {
      window.Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <h2 className="text-2xl font-semibold mb-2">
        Something went wrong!
      </h2>
      <p className="text-gray-600 mb-4 text-center max-w-md">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button onClick={() => window.location.href = "/"} variant="outline">
          Go home
        </Button>
      </div>
    </div>
  );
}
```

### Component Error Boundary

```typescript
// components/ErrorBoundary.tsx
"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          reset={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
      <h3 className="font-semibold text-red-800">Component Error</h3>
      <p className="text-red-600 text-sm mt-1">{error.message}</p>
      <button
        onClick={reset}
        className="mt-2 text-sm text-red-600 underline"
      >
        Try again
      </button>
    </div>
  );
}
```

## Loading States

### Skeleton Loading

```typescript
// components/ProjectListSkeleton.tsx
export function ProjectListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-24 bg-gray-200 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

// Usage
export default async function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectListSkeleton />}>
      <ProjectList />
    </Suspense>
  );
}
```

## Retry Mechanisms

### Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );

      onRetry?.(error as Error, attempt + 1);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
const data = await retryWithBackoff(
  () => fetch("/api/flaky-endpoint").then(r => r.json()),
  {
    onRetry: (error, attempt) => {
      console.log(`Retry attempt ${attempt} after error:`, error);
    },
  }
);
```

## Error Monitoring

### Structured Logging

```typescript
// libs/logger.ts
export const logger = {
  error: (message: string, context?: any) => {
    console.error(`[ERROR] ${message}`, {
      timestamp: new Date().toISOString(),
      ...context,
    });

    // Send to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      // Sentry, LogRocket, etc.
    }
  },

  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, {
      timestamp: new Date().toISOString(),
      ...context,
    });
  },

  info: (message: string, context?: any) => {
    console.log(`[INFO] ${message}`, {
      timestamp: new Date().toISOString(),
      ...context,
    });
  },
};
```

## Common Error Scenarios

| Scenario | User Message | Log Details | Recovery |
|----------|--------------|-------------|----------|
| Network timeout | "Request timed out. Please try again." | Full request details, duration | Retry with backoff |
| Invalid input | "Please check your input and try again." | Validation errors, field details | Show field errors |
| Auth expired | "Session expired. Please sign in again." | User ID, session age | Redirect to login |
| Rate limit | "Too many requests. Please wait." | IP, endpoint, request count | Show countdown |
| Server error | "Something went wrong. Please try again." | Stack trace, request ID | Offer retry |
| Not found | "The requested resource was not found." | Resource type, ID | Suggest alternatives |
| Permission denied | "You don't have permission to access this." | User role, resource | Redirect to allowed area |