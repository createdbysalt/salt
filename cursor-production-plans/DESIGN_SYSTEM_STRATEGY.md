# Salt Core Design System - Integration Strategy

## Three-Layer Color & Branding Architecture

Salt Core uses a three-layer integration strategy to balance brand identity, data clarity, and system consistency.

---

## 🎨 Layer 1: Brand Layer

**Purpose**: Salt's identity drives user-facing interactions

### What Uses Brand Color (Ocean Blue #6b9cff):
- ✅ Primary buttons & CTAs
- ✅ Logo placement
- ✅ Links & navigation
- ✅ Active states
- ✅ Interactive elements (hover, focus)
- ✅ Progress indicators

### Implementation:
```css
/* Brand color is the default accent preset (ocean) */
--primary: rgb(var(--accent-500)); /* #6b9cff */
```

### Usage Example:
```tsx
<Button variant="default">Salt Blue CTA</Button>
<Link className="text-primary">Navigation Link</Link>
```

---

## 📊 Layer 2: Data Visualization Layer

**Purpose**: Multi-color system for data clarity

### What Uses Multi-Color Palette:
- ✅ Chart colors (line, bar, pie charts)
- ✅ Stat cards with color-coded metrics
- ✅ Metrics & KPIs
- ✅ Data categories
- ✅ Status badges (when not semantic)

### Color Palette:
| Color    | Hex       | RGB             | Use Case                    |
|----------|-----------|-----------------|----------------------------|
| Emerald  | `#3fb892` | `63 184 146`    | Growth, positive metrics   |
| Blue     | `#6b9cff` | `107 156 255`   | Primary data series        |
| Orange   | `#ff7b54` | `255 123 84`    | Warnings, attention        |
| Lime     | `#d4ff5e` | `212 255 94`    | Highlights, success        |
| Violet   | `#b8b3ff` | `184 179 255`   | Secondary data series      |

### Implementation:
```css
/* Multi-color chart palette */
--chart-1: 63 184 146;    /* Emerald */
--chart-2: 107 156 255;   /* Blue */
--chart-3: 255 123 84;    /* Orange */
--chart-4: 212 255 94;    /* Lime */
--chart-5: 184 179 255;   /* Violet */
```

### Usage Example:
```tsx
<LineChart
  data={data}
  lines={[
    { dataKey: "revenue", stroke: "rgb(var(--chart-1))" },
    { dataKey: "expenses", stroke: "rgb(var(--chart-2))" },
  ]}
/>
```

---

## 🏗️ Layer 3: System Layer

**Purpose**: Foundation remains unchanged across all contexts

### What Stays Consistent:
- ✅ Spacing system (`--spacing-*`)
- ✅ Border radius (`--radius`)
- ✅ Typography scale (`--font-size-*`)
- ✅ Grid structure
- ✅ Breakpoints
- ✅ Motion & transitions
- ✅ Shadows & elevation

### Why This Matters:
The system layer ensures **core integrity is maintained** even when:
- Clients customize their Bridge portal accent colors
- Different data visualizations require varied palettes
- Brand updates occur

### Implementation:
```css
/* System tokens - never change per-theme */
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;

--radius: 0.5rem;
--motion-duration-1: 200ms;
```

---

## 🎯 Decision Matrix

Use this matrix to decide which layer applies:

| Element Type          | Layer | Color Source        |
|----------------------|-------|---------------------|
| CTA Button           | 1     | Brand (ocean blue)  |
| Navigation Link      | 1     | Brand (ocean blue)  |
| Chart Line           | 2     | Multi-color palette |
| Stat Card Icon       | 2     | Multi-color palette |
| Card Padding         | 3     | System spacing      |
| Button Border Radius | 3     | System radius       |
| Text Size            | 3     | System typography   |

---

## 🚫 Anti-Patterns (Don't Do This)

❌ **Don't use brand color for data visualization**
```tsx
// BAD: All data series in brand blue
<LineChart lines={[
  { dataKey: "metric1", stroke: "rgb(var(--primary))" },
  { dataKey: "metric2", stroke: "rgb(var(--primary))" }
]} />
```

✅ **Do use multi-color palette for data**
```tsx
// GOOD: Distinct colors for clarity
<LineChart lines={[
  { dataKey: "metric1", stroke: "rgb(var(--chart-1))" },
  { dataKey: "metric2", stroke: "rgb(var(--chart-2))" }
]} />
```

❌ **Don't use data visualization colors for CTAs**
```tsx
// BAD: Using chart colors for buttons
<Button style={{ backgroundColor: "rgb(var(--chart-3))" }}>Submit</Button>
```

✅ **Do use brand color for CTAs**
```tsx
// GOOD: Use primary/brand color
<Button variant="default">Submit</Button>
```

---

## 🔄 White-Label Considerations

When clients customize their Bridge portal:

### What Changes:
- **Layer 1**: Accent preset changes (e.g., ocean → violet)
- **Layer 2**: Data visualization colors **remain the same** for consistency

### What Stays:
- **Layer 3**: System foundations never change

### Implementation:
```tsx
// Bridge portal with custom accent
<html data-theme="dark" data-accent="violet">
  {/* Primary buttons now use violet instead of ocean blue */}
  <Button>Custom Brand CTA</Button>
  
  {/* Charts still use multi-color palette */}
  <Chart colors={["chart-1", "chart-2", "chart-3"]} />
</html>
```

---

## 📚 Related Documentation

- [Design System Implementation](./DESIGN_SYSTEM_IMPLEMENTATION.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Brand Guidelines](./brand/)

---

## ✅ Quick Reference

**Layer 1 (Brand)**: Interactive elements → Use `--primary` or `--accent-*`  
**Layer 2 (Data)**: Visualizations → Use `--chart-1` through `--chart-5`  
**Layer 3 (System)**: Foundations → Use `--spacing-*`, `--font-size-*`, `--radius`

**Default Brand Color**: Ocean Blue (`#6b9cff`)  
**Data Viz Palette**: Emerald, Blue, Orange, Lime, Violet

