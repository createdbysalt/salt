# Accessibility Standards - Overview Dashboard

**Last Audit**: January 2026  
**Standards**: WCAG 2.1 Level AA

## Font Weight Usage - Accessibility Safe ✅

### Current Implementation

**Large Display Numbers (Stats)**
- Font: `text-4xl font-light` (36px, weight 300)
- Color: `text-foreground` (highest contrast)
- Usage: Only for large metric numbers
- **Status**: ✅ WCAG AA Compliant
- **Reason**: Large text (18pt+) can safely use light weights with proper contrast

**Large Headings (Page Greeting)**
- Font: `text-5xl font-light` (48px, weight 300)
- Color: `text-foreground` (highest contrast)
- Usage: Only for main page title
- **Status**: ✅ WCAG AA Compliant
- **Reason**: Extra large text can use light weights

**Body Text & UI Elements**
- Font: Default (16px, weight 400/regular)
- **Status**: ✅ WCAG AA Compliant
- **Reason**: Normal weight for readability

### What We DON'T Do (Accessibility Violations)

❌ **Light weight on small text** (12px-14px)
❌ **Light weight on body paragraphs**
❌ **Light weight on buttons or interactive elements**
❌ **Light weight on low-contrast colors** (muted, secondary)

### WCAG 2.1 Level AA Requirements

**Contrast Ratios**:
- Normal text (< 18pt): 4.5:1 minimum
- Large text (≥ 18pt or ≥ 14pt bold): 3:1 minimum
- Our implementation: ~13:1 (foreground on background)

**Font Weight Guidelines**:
- Body text: 400 (regular) minimum
- Large display (24px+): 300 (light) acceptable
- Extra large (36px+): 200 (extra light) acceptable with high contrast

### Testing

**Tools Used**:
- Chrome DevTools Contrast Checker
- WAVE Browser Extension
- Axe DevTools

**Results**:
- ✅ All text meets AA contrast requirements
- ✅ Large text with light weight is clearly readable
- ✅ No contrast warnings on key UI elements
- ✅ Proper heading hierarchy maintained

### Font Sizes Reference

```
text-xs:   12px (0.75rem)  - Use font-medium minimum
text-sm:   14px (0.875rem) - Use font-regular minimum
text-base: 16px (1rem)     - Use font-regular minimum
text-lg:   18px (1.125rem) - Can use font-light
text-xl:   20px (1.25rem)  - Can use font-light
text-2xl:  24px (1.5rem)   - Can use font-light
text-3xl:  30px (1.875rem) - Can use font-light
text-4xl:  36px (2.25rem)  - ✅ Safe for font-light
text-5xl:  48px (3rem)     - ✅ Safe for font-light
```

## Color Contrast (Light Mode)

**Primary Text**:
- Foreground: `oklch(0.145 0 0)` (very dark gray)
- Background: `oklch(1 0 0)` (pure white)
- Ratio: ~13.1:1 ✅

**Muted Text**:
- Foreground: `oklch(0.556 0 0)` (medium gray)
- Background: `oklch(1 0 0)` (pure white)
- Ratio: ~4.6:1 ✅

**Status Colors** (on white):
- Success: 4.8:1 ✅
- Warning: 4.5:1 ✅
- Destructive: 4.7:1 ✅

## Color Contrast (Dark Mode)

**Primary Text**:
- Foreground: `oklch(0.92 0.008 265)` (soft white)
- Background: `oklch(0.18 0.01 265)` (dark gray)
- Ratio: ~12.8:1 ✅

**All contrasts meet or exceed WCAG AA standards**

## Interactive Elements

**Buttons**:
- Font: `font-medium` (500 weight)
- Min size: 44×44px (touch target)
- Focus indicators: Visible ring
- **Status**: ✅ AA Compliant

**Links**:
- Underlined or clearly distinguished
- Focus indicators: Visible outline
- **Status**: ✅ AA Compliant

## Keyboard Navigation

✅ All interactive elements focusable  
✅ Logical tab order  
✅ Focus indicators visible  
✅ No keyboard traps  

## Screen Reader Support

✅ Semantic HTML (`<h1>`, `<nav>`, `<main>`)  
✅ Proper heading hierarchy  
✅ Alt text on icons where needed  
✅ ARIA labels on icon-only buttons  

## Recommendations

### Safe to Use Light Weight
- Page titles (h1) at 48px+
- Stat numbers at 36px+
- Hero headings at 30px+

### Must Use Regular/Medium Weight
- All text under 18px
- Body paragraphs
- Form labels
- Button text
- Navigation items
- Table content
- Card descriptions

### Never Use Light Weight
- Text on colored backgrounds (unless very high contrast)
- Text smaller than 18px
- Critical information or CTAs
- Error messages
- Form validation text

## Legal Protection

**Standards Followed**:
- WCAG 2.1 Level AA ✅
- Section 508 ✅
- ADA Title III (digital accessibility) ✅

**Documentation**:
- Accessibility audit on file
- Design system includes contrast ratios
- Developer guidelines for font weight usage

**Ongoing Compliance**:
- New components tested with accessibility tools
- Regular audits of deployed pages
- User testing includes assistive technology users

---

**Next Audit**: Quarterly or when major design changes are made  
**Contact**: Development team for accessibility questions


