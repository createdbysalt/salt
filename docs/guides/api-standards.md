# 📡 API Standards: The Schema-First Protocol

---

## 1. The Golden Rule: Schema First

We **NEVER** write manual TypeScript interfaces for API requests/responses. We define **Zod Schemas** in the shared package, and the AI infers types from them.

### Workflow
```
┌─────────────────────────────────────────────────────────────────┐
│  1. DEFINE SCHEMA                                               │
│     packages/shared-types/src/domain/<entity>.ts                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. EXPORT TYPE                                                 │
│     z.infer<typeof Schema> for frontend use                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. IMPLEMENT ROUTE                                             │
│     Import schema in Route Handler to validate input            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. CONSUME IN CLIENT                                           │
│     Import inferred type in frontend query hook                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why?** This guarantees that if the Backend changes a field from `string` to `number`, the Frontend build will **fail immediately** (Type Safety), preventing runtime crashes.

---

## 2. Shared Types Structure

> **Rule:** All data contracts live in `packages/shared-types`. Do NOT define types inside `apps/backend` or `apps/frontend`.

### Location
```
packages/shared-types/
└── src/
    └── domain/
        ├── users.ts
        ├── projects.ts
        └── index.ts      ← Re-exports all schemas
```

### Example Schema
```typescript
// packages/shared-types/src/domain/users.ts
import { z } from "zod";

// 1. The Schema (Runtime Validation)
export const CreateUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  // FORCE the AI to describe fields for OpenAPI generation later
  metadata: z.record(z.string()).optional().describe("User preferences JSON"),
});

// 2. The Type (Compile-time Safety)
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

// 3. The Response Schema (Standardized)
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.date(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;
```

---

## 3. Route Handler Pattern (Next.js App Router)

AI Agents **must** follow this exact structure for `route.ts` files to ensure error handling and validation are never skipped.

### Location
```
apps/backend/src/app/api/v1/[resource]/route.ts
```

### Template
```typescript
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";                    // Middleware wrapper
import { CreateUserSchema } from "@repo/shared-types";    // IMPORT FROM SHARED
import { createUser } from "@/services/users";            // Business Logic
import { handleApiError } from "@/lib/api-error";         // Error utility

export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();

    // 1. VALIDATION (Crash Early)
    // Use .parse(), NOT .safeParse() — global error handler catches exceptions
    const payload = CreateUserSchema.parse(body);

    // 2. EXECUTION (Service Layer)
    // Route handlers should NOT contain business logic. Call a service.
    const result = await createUser(payload);

    // 3. RESPONSE (Standard Envelope)
    return NextResponse.json({
      data: result,
      meta: { timestamp: new Date().toISOString() }
    }, { status: 201 });

  } catch (error) {
    // 4. ERROR HANDLING
    // Always use shared error utility, never raw console.log
    return handleApiError(error); 
  }
});
```

### Route Handler Rules

| Rule | Requirement |
|------|-------------|
| **Validation** | Use `.parse()` not `.safeParse()` — let errors bubble up |
| **Business Logic** | Never in route handlers. Call service functions. |
| **Response** | Always use standard envelope: `{ data, meta }` |
| **Errors** | Always use `handleApiError()` utility |

---

## 4. Standardized Error Handling (RFC 7807)

We do **not** send generic strings. We send structured JSON so the Frontend knows exactly what went wrong.

### Error Response Structure
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "issue": "invalid_string",
      "received": "not-an-email"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | When |
|------|-------------|------|
| `VALIDATION_ERROR` | 400 | Zod schema validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate resource (e.g., email exists) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Implementation

The `handleApiError` utility (in `apps/backend/src/lib/api-error.ts`) automatically converts Zod errors into this format. **Always use it.**
```typescript
// apps/backend/src/lib/api-error.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.flatten().fieldErrors,
      }
    }, { status: 400 });
  }

  // Log unexpected errors (but don't expose to client)
  console.error("[API Error]", error);
  
  return NextResponse.json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    }
  }, { status: 500 });
}
```

---

## 5. Frontend Consumption (TanStack Query)

> **Rule:** Do NOT use `fetch` directly in React components. Use the Typed Query Pattern.

### Query Hook Template
```typescript
// apps/frontend/src/hooks/use-create-user.ts
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateUserRequest, UserResponse } from "@repo/shared-types"; 

export const useCreateUser = () => {
  return useMutation<UserResponse, Error, CreateUserRequest>({
    mutationFn: async (json) => {
      // The 'api' wrapper handles auth headers and type inference
      return api.post("/users", { json });
    },
  });
};
```

### API Client Wrapper
```typescript
// apps/frontend/src/lib/api-client.ts
import ky from "ky";

export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getAuthToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
  },
});
```

---

## 6. HTTP Method Rules

| Method | Purpose | Body? | Idempotent? |
|--------|---------|-------|-------------|
| `GET` | Fetch data | ❌ Never | ✅ Yes |
| `POST` | Create resource | ✅ Yes | ❌ No |
| `PUT` | Full replacement | ✅ Yes | ✅ Yes |
| `PATCH` | Partial update | ✅ Yes | ✅ Yes |
| `DELETE` | Remove resource | ❌ No | ✅ Yes |

### Notes

- **GET**: Never accept a request body. Use query params for filtering (`?status=active`)
- **PATCH**: Preferred over PUT for updates (more flexible)
- **PUT**: Rarely used — requires sending the entire resource

---

## 7. Versioning

> **Rule:** All routes must start with `/api/v1/`.
```
/api/v1/users
/api/v1/projects
/api/v1/projects/:id/tasks
```

### Breaking Changes

Breaking changes **require** a new version:
```
/api/v2/users    ← New version for breaking changes
```

### What Counts as Breaking?

| Change | Breaking? |
|--------|-----------|
| Adding optional field | ❌ No |
| Adding required field | ✅ Yes |
| Removing field | ✅ Yes |
| Changing field type | ✅ Yes |
| Renaming field | ✅ Yes |
| Changing enum values | ✅ Yes |

---

## 8. Quick Reference

### File Locations

| Type | Location |
|------|----------|
| Schemas | `packages/shared-types/src/domain/*.ts` |
| Routes | `apps/backend/src/app/api/v1/[resource]/route.ts` |
| Services | `apps/backend/src/services/*.ts` |
| Query Hooks | `apps/frontend/src/hooks/use-*.ts` |
| API Client | `apps/frontend/src/lib/api-client.ts` |
| Error Handler | `apps/backend/src/lib/api-error.ts` |

### Checklist for New Endpoints

- [ ] Schema defined in `packages/shared-types`
- [ ] Type exported with `z.infer<>`
- [ ] Route handler uses `.parse()` for validation
- [ ] Business logic in service layer (not route handler)
- [ ] Response uses standard envelope `{ data, meta }`
- [ ] Errors handled with `handleApiError()`
- [ ] Frontend hook created with proper types
- [ ] Route versioned under `/api/v1/`