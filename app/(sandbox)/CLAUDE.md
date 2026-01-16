# 🧪 Development Sandbox & Tools

**Context:** You are working in the development sandbox - a protected environment for testing, prototyping, and design system development.
**Goal:** Rapid iteration, component testing, and developer tooling without affecting production code.

---

## 1. 🎯 Sandbox Overview

The sandbox provides isolated environments for:
- **Design System**: Component library testing and documentation
- **Dev Login**: Simplified authentication for development
- **Playground**: Feature prototyping and experimentation

### Route Structure
```
app/(sandbox)/
├── design-system/     # Component library showcase
│   ├── colors/       # Color palette testing
│   ├── typography/   # Font and text styling
│   ├── components/   # UI component demos
│   └── layouts/      # Layout pattern testing
├── dev-login/        # Development authentication bypass
└── playground/       # Feature prototyping area
```

---

## 2. 🔧 Development Authentication

### Dev Login Pattern
```typescript
// app/(sandbox)/dev-login/page.tsx
export default function DevLogin() {
  // Bypass normal auth flow for development
  const loginAsDeveloper = async () => {
    // SAFE: Only available in development environment
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Dev login only available in development')
    }

    // Set development session
    await setDevSession({
      user: {
        id: 'dev-user-id',
        email: 'dev@saltcore.com',
        role: 'developer'
      }
    })
  }

  return (
    <DevLoginForm onLogin={loginAsDeveloper} />
  )
}
```

### Security Constraints
```typescript
// ❌ NEVER expose dev tools in production
if (process.env.NODE_ENV === 'production') {
  return notFound()
}

// ✅ Always check environment
const isDevEnvironment = process.env.NODE_ENV === 'development'
if (!isDevEnvironment) {
  redirect('/signin')
}
```

---

## 3. 🎨 Design System Development

### Component Testing Pattern
```typescript
// app/(sandbox)/design-system/components/[componentId]/page.tsx
interface ComponentDemoProps {
  params: { componentId: string }
}

export default function ComponentDemo({ params }: ComponentDemoProps) {
  const component = getComponentBySlug(params.componentId)

  return (
    <DevLayout>
      <ComponentShowcase
        component={component}
        variants={component.variants}
        props={component.availableProps}
      />
      <CodePreview code={component.sourceCode} />
      <PropsTable props={component.availableProps} />
    </DevLayout>
  )
}
```

### Design Token Testing
```typescript
// Testing color, typography, spacing tokens
export function DesignTokenDemo() {
  const tokens = {
    colors: useDesignTokens('colors'),
    typography: useDesignTokens('typography'),
    spacing: useDesignTokens('spacing')
  }

  return (
    <div>
      <ColorPalette colors={tokens.colors} />
      <TypographyScale typography={tokens.typography} />
      <SpacingScale spacing={tokens.spacing} />
    </div>
  )
}
```

---

## 4. 🔬 Playground Environment

### Feature Prototyping
```typescript
// app/(sandbox)/playground/[experimentId]/page.tsx
export default function ExperimentPage({ params }: { params: { experimentId: string } }) {
  const experiment = getExperiment(params.experimentId)

  return (
    <ExperimentLayout>
      <ExperimentHeader
        title={experiment.title}
        description={experiment.description}
        status={experiment.status}
      />
      <ExperimentContent experiment={experiment} />
      <ExperimentControls onReset={handleReset} />
    </ExperimentLayout>
  )
}
```

### Safe Prototyping Patterns
```typescript
// ✅ Sandbox-only features
export function PlaygroundFeature() {
  // Clear separation from production code
  const isSandbox = usePathname().startsWith('/playground')

  if (!isSandbox) {
    return null
  }

  return (
    <div className="border-2 border-yellow-400 p-4">
      <div className="text-yellow-600 text-sm mb-2">
        🧪 Experimental Feature - Sandbox Only
      </div>
      <ExperimentalComponent />
    </div>
  )
}
```

---

## 5. 📋 Component Documentation

### Auto-Generated Props Tables
```typescript
// Generate documentation from TypeScript types
export function generateComponentDocs(componentName: string) {
  const componentType = getTypeDefinition(componentName)

  return {
    props: extractPropsFromType(componentType),
    examples: generateExamples(componentType),
    variants: extractVariants(componentType)
  }
}

// Usage in sandbox
export function ComponentDocPage({ component }: { component: string }) {
  const docs = generateComponentDocs(component)

  return (
    <div>
      <PropsTable props={docs.props} />
      <ExampleGrid examples={docs.examples} />
      <VariantShowcase variants={docs.variants} />
    </div>
  )
}
```

---

## 6. 🔍 Development Tools

### Debug Panel
```typescript
export function DevDebugPanel() {
  const { user, session } = useAuth()
  const { theme } = useTheme()

  // Only show in sandbox environment
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <DebugPanel>
      <DebugSection title="Authentication">
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </DebugSection>
      <DebugSection title="Theme">
        <pre>{JSON.stringify(theme, null, 2)}</pre>
      </DebugSection>
      <DebugSection title="Environment">
        <pre>{JSON.stringify(process.env, null, 2)}</pre>
      </DebugSection>
    </DebugPanel>
  )
}
```

### Performance Monitoring
```typescript
export function DevPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>()

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      setMetrics(processPerformanceEntries(entries))
    })

    observer.observe({ entryTypes: ['measure', 'navigation'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded">
      <h4>Performance Metrics</h4>
      <div>LCP: {metrics?.lcp}ms</div>
      <div>FID: {metrics?.fid}ms</div>
      <div>CLS: {metrics?.cls}</div>
    </div>
  )
}
```

---

## 7. 🧪 Testing Utilities

### Mock Data Generation
```typescript
// Generate realistic test data for sandbox
export function generateMockData(type: 'users' | 'projects' | 'clients') {
  const generators = {
    users: () => ({
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      name: faker.name.fullName(),
      avatar: faker.image.avatar()
    }),
    projects: () => ({
      id: faker.datatype.uuid(),
      name: faker.commerce.productName(),
      description: faker.lorem.paragraph(),
      status: faker.helpers.arrayElement(['active', 'completed', 'paused'])
    }),
    clients: () => ({
      id: faker.datatype.uuid(),
      company: faker.company.name(),
      industry: faker.commerce.department(),
      website: faker.internet.url()
    })
  }

  return Array.from({ length: 10 }, generators[type])
}
```

---

## 8. 📱 Responsive Testing

### Device Preview
```typescript
export function DevicePreviewGrid() {
  const devices = [
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {devices.map(device => (
        <DeviceFrame
          key={device.name}
          name={device.name}
          width={device.width}
          height={device.height}
        >
          <ComponentUnderTest />
        </DeviceFrame>
      ))}
    </div>
  )
}
```

---

## 9. ⚡ Hot Reloading & Development

### Component Hot Reloading
```typescript
// Enable fast refresh for component development
if (process.env.NODE_ENV === 'development') {
  // Hot reload specific components
  module.hot?.accept('./ComponentUnderDevelopment', () => {
    console.log('Component reloaded')
  })
}
```

---

## 10. 📖 Documentation Generation

### Auto-Generated Storybook
```typescript
// Generate Storybook stories from sandbox components
export function generateStorybookStories(componentPath: string) {
  const component = importComponent(componentPath)
  const stories = generateStoriesFromComponent(component)

  return {
    title: `Sandbox/${component.name}`,
    component: component,
    argTypes: generateArgTypesFromProps(component),
    stories: stories
  }
}
```

---

## 🛡️ Sandbox Safety Rules

### Environment Isolation
- [ ] All sandbox routes are development-only
- [ ] No production data in sandbox environments
- [ ] Clear visual indicators for experimental features
- [ ] Automatic cleanup of development sessions

### Code Organization
- [ ] Sandbox code never imported into production
- [ ] Clear separation between experimental and stable features
- [ ] Documentation for all experimental components
- [ ] Version control for design system iterations

**Remember:** The sandbox is for rapid experimentation. Keep it clean, documented, and isolated from production systems.