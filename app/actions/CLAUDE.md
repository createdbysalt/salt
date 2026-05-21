# ⚡ Server Actions Architecture

**Context:** You are working with Next.js Server Actions - the primary way to handle mutations in Salt.
**Goal:** Type-safe, performant mutations with proper error handling and security.

---

## 1. 🎯 Server Actions Overview

Server Actions replace traditional API routes for mutations in our Next.js 15 App Router application.

### Directory Structure
```
app/actions/
├── billing/          # Stripe subscriptions, payments, invoices
├── calendar/         # Event scheduling and management
├── clients/          # Client management and onboarding
├── insights/         # AI analytics and reporting
├── meetings/         # Meeting creation and updates
├── messaging/        # Message sending and threads
├── profile/          # User profile updates
├── projects/         # Project management operations
├── retainers/        # Retainer agreements and billing
├── seo/              # SEO optimization actions
└── tags/             # Tag management and assignment
```

---

## 2. 🏗️ Server Action Patterns

### Standard Action Structure
```typescript
"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/app/_lib/supabase/server'
import { actionValidator } from '@/app/_lib/validation'
import { z } from 'zod'

// Input validation schema
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientId: z.string().uuid('Invalid client ID'),
  description: z.string().optional(),
  budget: z.number().positive().optional()
})

export async function createProject(formData: FormData) {
  // 1. Validate input
  const rawData = {
    name: formData.get('name'),
    clientId: formData.get('clientId'),
    description: formData.get('description'),
    budget: Number(formData.get('budget'))
  }

  const validation = createProjectSchema.safeParse(rawData)
  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      details: validation.error.flatten()
    }
  }

  const data = validation.data

  try {
    // 2. Get authenticated user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // 3. Perform database operation (RLS handles authorization)
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        ...data,
        created_by: user.id,
        studio_id: user.user_metadata.studio_id
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { success: false, error: 'Failed to create project' }
    }

    // 4. Revalidate affected routes
    revalidatePath('/dashboard/projects')
    revalidatePath(`/dashboard/clients/${data.clientId}`)

    // 5. Return success result
    return {
      success: true,
      data: project
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
```

### Progressive Enhancement Pattern
```typescript
// Form component with progressive enhancement
export function CreateProjectForm({ clientId }: { clientId: string }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<ActionResult | null>(null)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setResult(null)

    const result = await createProject(formData)

    setResult(result)
    setPending(false)

    // Reset form on success
    if (result.success) {
      // Form will reset naturally with revalidation
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="clientId" value={clientId} />

      <div>
        <label htmlFor="name">Project Name</label>
        <input
          type="text"
          id="name"
          name="name"
          required
          disabled={pending}
        />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          disabled={pending}
        />
      </div>

      <button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Project'}
      </button>

      {result && !result.success && (
        <div className="text-red-600">
          {result.error}
        </div>
      )}
    </form>
  )
}
```

---

## 3. 💳 Billing Actions Pattern

### Stripe Integration
```typescript
// app/actions/billing/create-checkout-session.ts
"use server"

import { stripe } from '@/app/_lib/stripe'
import { createServerClient } from '@/app/_lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createCheckoutSession(priceId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Authentication required' }
  }

  try {
    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      })
      customerId = customer.id

      // Save customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      metadata: { userId: user.id }
    })

    if (!session.url) {
      return { success: false, error: 'Failed to create checkout session' }
    }

    // Redirect to Stripe Checkout
    redirect(session.url)

  } catch (error) {
    console.error('Stripe error:', error)
    return { success: false, error: 'Payment processing error' }
  }
}
```

---

## 4. 🔒 Security Patterns

### Authorization Checks
```typescript
"use server"

import { hasPermission } from '@/app/_lib/permissions'

export async function deleteProject(projectId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Authentication required' }
  }

  // Check project ownership/permissions
  const canDelete = await hasPermission(user.id, 'projects:delete', {
    projectId
  })

  if (!canDelete) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // RLS policies will double-check this, but explicit check provides better UX
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    return { success: false, error: 'Failed to delete project' }
  }

  revalidatePath('/dashboard/projects')
  return { success: true }
}
```

### Input Sanitization
```typescript
"use server"

import { sanitizeHtml } from '@/app/_lib/security'

export async function updateProjectDescription(projectId: string, description: string) {
  // Sanitize HTML content
  const sanitizedDescription = sanitizeHtml(description, {
    allowedTags: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br'],
    allowedAttributes: {}
  })

  // Validate length
  if (sanitizedDescription.length > 10000) {
    return { success: false, error: 'Description too long' }
  }

  // Update in database
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('projects')
    .update({ description: sanitizedDescription })
    .eq('id', projectId)

  if (error) {
    return { success: false, error: 'Failed to update description' }
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}
```

---

## 5. 📊 Analytics Integration

### Event Tracking in Actions
```typescript
"use server"

import { trackEvent } from '@/app/_lib/analytics'

export async function completeProject(projectId: string) {
  const supabase = await createServerClient()

  // Update project status
  const { data: project, error } = await supabase
    .from('projects')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    return { success: false, error: 'Failed to complete project' }
  }

  // Track analytics event
  await trackEvent({
    event: 'project_completed',
    properties: {
      projectId: project.id,
      projectName: project.name,
      duration: calculateProjectDuration(project.created_at, project.completed_at)
    }
  })

  revalidatePath('/dashboard/projects')
  return { success: true, data: project }
}
```

---

## 6. 🔄 Optimistic Updates

### Client-Side Optimistic Updates
```typescript
"use client"

import { useOptimistic } from 'react'
import { toggleProjectFavorite } from '@/app/actions/projects/toggle-favorite'

export function ProjectCard({ project }: { project: Project }) {
  const [optimisticProject, addOptimisticUpdate] = useOptimistic(
    project,
    (currentProject, newIsFavorite: boolean) => ({
      ...currentProject,
      is_favorite: newIsFavorite
    })
  )

  async function handleToggleFavorite() {
    // Optimistic update
    addOptimisticUpdate(!optimisticProject.is_favorite)

    // Server action
    const result = await toggleProjectFavorite(project.id)

    if (!result.success) {
      // Revert optimistic update by triggering re-render
      // This happens automatically when the action completes
      console.error('Failed to toggle favorite:', result.error)
    }
  }

  return (
    <div>
      <h3>{project.name}</h3>
      <button onClick={handleToggleFavorite}>
        {optimisticProject.is_favorite ? '❤️' : '🤍'}
      </button>
    </div>
  )
}
```

---

## 7. 🔄 Background Processing

### Queue Integration
```typescript
"use server"

import { addToQueue } from '@/app/_lib/queue'

export async function generateProjectInsights(projectId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Authentication required' }
  }

  try {
    // Queue background job for heavy processing
    const jobId = await addToQueue('generate-insights', {
      projectId,
      userId: user.id,
      requestedAt: new Date().toISOString()
    })

    // Update project to show insights are being generated
    await supabase
      .from('projects')
      .update({
        insights_status: 'generating',
        insights_job_id: jobId
      })
      .eq('id', projectId)

    revalidatePath(`/dashboard/projects/${projectId}/insights`)

    return {
      success: true,
      message: 'Insights generation started',
      jobId
    }

  } catch (error) {
    console.error('Queue error:', error)
    return { success: false, error: 'Failed to start insights generation' }
  }
}
```

---

## 8. 📝 Form Validation Patterns

### Multi-Step Form Actions
```typescript
"use server"

export async function updateClientStep1(clientId: string, formData: FormData) {
  const schema = z.object({
    company: z.string().min(1),
    industry: z.string(),
    website: z.string().url().optional()
  })

  const validation = schema.safeParse({
    company: formData.get('company'),
    industry: formData.get('industry'),
    website: formData.get('website')
  })

  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors
    }
  }

  // Save to database
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('clients')
    .update(validation.data)
    .eq('id', clientId)

  if (error) {
    return { success: false, error: 'Database error' }
  }

  return { success: true, nextStep: 2 }
}
```

---

## 9. ⚠️ Error Handling

### Standardized Error Responses
```typescript
// Types for consistent error handling
export type ActionResult<T = any> = {
  success: true
  data?: T
  message?: string
} | {
  success: false
  error: string
  fieldErrors?: Record<string, string[]>
  code?: string
}

// Helper for consistent error handling
export function handleActionError(error: unknown): ActionResult {
  if (error instanceof z.ZodError) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: error.flatten().fieldErrors
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: 'UNKNOWN_ERROR'
    }
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'UNEXPECTED_ERROR'
  }
}
```

---

## 10. 🧪 Testing Server Actions

### Unit Testing Pattern
```typescript
// __tests__/actions/projects.test.ts
import { createProject } from '@/app/actions/projects/create'
import { createMockSupabaseClient } from '@/app/_lib/test-utils'

// Mock Next.js functions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

describe('createProject', () => {
  it('should create project with valid data', async () => {
    const mockSupabase = createMockSupabaseClient()

    const formData = new FormData()
    formData.append('name', 'Test Project')
    formData.append('clientId', 'client-123')

    const result = await createProject(formData)

    expect(result.success).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('projects')
  })

  it('should reject invalid data', async () => {
    const formData = new FormData()
    // Missing required name

    const result = await createProject(formData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('required')
  })
})
```

---

## 🛡️ Action Security Checklist

### Before Deploying Actions
- [ ] **Authentication**: All actions verify user authentication
- [ ] **Authorization**: RLS policies or explicit permission checks
- [ ] **Input Validation**: Zod schemas for all inputs
- [ ] **Output Sanitization**: Clean data before sending to client
- [ ] **Error Handling**: Consistent error response format
- [ ] **Rate Limiting**: Applied to mutation-heavy actions
- [ ] **Audit Logging**: Important actions are logged
- [ ] **Revalidation**: Affected routes are revalidated

**Remember:** Server Actions are powerful but require careful security consideration. Always validate, authorize, and sanitize.