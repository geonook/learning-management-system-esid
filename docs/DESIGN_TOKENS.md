# LMS Design Tokens Reference

> **Version**: 1.0
> **Last Updated**: 2026-01-10
> **Design System**: Notion-inspired + Apple HIG colors

This document provides a centralized reference for all design tokens used in the LMS project.

---

## Color System

### Text Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--text-primary` | `#37352f` (55 53 47) | `#ebebea` (235 235 234) | Primary text, headings |
| `--text-secondary` | `#6b6b6b` (107 107 107) | `#9b9b9b` (155 155 155) | Secondary text, labels |
| `--text-tertiary` | `#9b9b9b` (155 155 155) | `#6b6b6b` (107 107 107) | Placeholder, muted text |

**Tailwind classes**: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`

### Surface Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--bg-primary` | `#fafafa` (250 250 250) | `#191919` (25 25 25) | Main background |
| `--bg-secondary` | `#f7f6f3` (247 246 243) | `#202020` (32 32 32) | Section background |
| `--bg-tertiary` | `#f1f1ef` (241 241 239) | `#252525` (37 37 37) | Nested elements |
| `--bg-elevated` | `#ffffff` (255 255 255) | `#252525` (37 37 37) | Cards, modals |
| `--surface-hover` | `#ebebea` (235 235 234) | `#2f2f2f` (47 47 47) | Hover states |
| `--surface-active` | `#e3e2e0` (227 226 224) | `#373737` (55 55 55) | Active states |

**Tailwind classes**: `bg-surface-primary`, `bg-surface-secondary`, `bg-surface-tertiary`, `bg-surface-elevated`

### Accent Colors (Apple HIG)

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-blue` | `#007AFF` (0 122 255) | Primary actions, links |
| `--accent-green` | `#34C759` (52 199 89) | Success states |
| `--accent-red` | `#FF3B30` (255 59 48) | Error, destructive actions |
| `--accent-orange` | `#FF9500` (255 149 0) | Warning states |
| `--accent-purple` | `#AF52DE` (175 82 222) | Special highlights |

**Tailwind classes**: `text-accent-blue`, `bg-accent-green`, `border-accent-red`, etc.

### Status Colors (Semantic Aliases)

| Token | Maps To | Usage |
|-------|---------|-------|
| `--accent-success` | `--accent-green` | Success messages, valid inputs |
| `--accent-warning` | `--accent-orange` | Warning messages, caution states |
| `--accent-info` | `--accent-blue` | Info messages, neutral notifications |

**Tailwind classes**: `text-accent-success`, `bg-accent-warning`, `border-accent-info`

### Border Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--border-default` | `#e3e2e0` (227 226 224) | `#373737` (55 55 55) | Standard borders |
| `--border-subtle` | `#ebebea` (235 235 234) | `#2f2f2f` (47 47 47) | Subtle dividers |

**Tailwind classes**: `border-border-default`, `border-border-subtle`

---

## Spacing System

Uses Tailwind's default spacing scale (4px base unit):

| Class | Size | Usage |
|-------|------|-------|
| `gap-1` / `p-1` | 4px | Tight spacing |
| `gap-2` / `p-2` | 8px | Compact spacing |
| `gap-3` / `p-3` | 12px | Default small |
| `gap-4` / `p-4` | 16px | Default medium |
| `gap-6` / `p-6` | 24px | Comfortable |
| `gap-8` / `p-8` | 32px | Spacious |

### Responsive Padding Pattern

```tsx
// Page content
<main className="p-3 sm:p-4 lg:p-6">

// Card padding
<div className="p-3 sm:p-4">

// Gap between elements
<div className="flex gap-3 sm:gap-4 lg:gap-6">
```

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Small elements (badges) |
| `--radius-md` | 12px | Medium elements (buttons, inputs) |
| `--radius-lg` | 16px | Large elements (cards) |
| `--radius-xl` | 20px | Extra large (modals) |

**Tailwind classes**: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`

---

## Shadows

| Token | Usage |
|-------|-------|
| `--shadow-sm` | Subtle elevation (hover states) |
| `--shadow-md` | Standard cards |
| `--shadow-lg` | Floating elements |
| `--shadow-xl` | Modals, dialogs |

**Tailwind classes**: `shadow-sm`, `shadow`, `shadow-lg`, `shadow-xl`

---

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Quick interactions |
| `--duration-normal` | 250ms | Standard transitions |
| `--duration-slow` | 350ms | Complex animations |
| `--ease-apple` | `cubic-bezier(0.16, 1, 0.3, 1)` | Apple-style easing |

**Tailwind classes**: `duration-fast`, `duration-normal`, `duration-slow`, `ease-apple`

---

## Responsive Breakpoints

| Breakpoint | Width | Device | LMS Behavior |
|------------|-------|--------|--------------|
| `xs` | 375px+ | iPhone SE | Minimum supported |
| `sm` | 640px+ | Large phones | Elements start showing |
| `md` | 768px+ | iPad portrait | Search visible |
| **`lg`** | 1024px+ | iPad landscape/Desktop | **Sidebar visible** |
| `xl` | 1280px+ | Large desktop | Max content width |
| `2xl` | 1536px+ | Ultra-wide | Extra spacing |

### Custom Variants

| Variant | Media Query | Usage |
|---------|-------------|-------|
| `portrait:` | `(orientation: portrait)` | iPad portrait mode |
| `landscape:` | `(orientation: landscape)` | iPad landscape mode |
| `touch:` | `(pointer: coarse)` | Touch devices |

---

## Component Tokens

### Grid Component

```tsx
import { Grid } from "@/components/ui/grid"

<Grid cols={3} gap="md">
  {/* Children */}
</Grid>
```

**cols variants**: `1`, `2`, `3`, `4`, `5`, `6`
**gap variants**: `none`, `xs`, `sm`, `md`, `lg`, `xl`

### Container Component

```tsx
import { Container } from "@/components/ui/container"

<Container size="lg" padding="md">
  {/* Children */}
</Container>
```

**size variants**: `xs` (max-w-md), `sm` (max-w-2xl), `md` (max-w-4xl), `lg` (max-w-6xl), `xl` (max-w-7xl), `full`
**padding variants**: `none`, `sm`, `md`, `lg`

### Input Component

```tsx
import { Input } from "@/components/ui/input"

<Input state="default" />  // Normal
<Input state="error" />    // Red border
<Input state="success" />  // Green border
```

---

## Accessibility Best Practices

### Icon Buttons

Icon-only buttons MUST have `aria-label`:

```tsx
// Correct
<Button size="icon" aria-label="Close menu">
  <X className="h-4 w-4" />
</Button>

// Incorrect - missing aria-label
<Button size="icon">
  <X className="h-4 w-4" />
</Button>
```

### Loading States

Use `LoadingSpinner` with custom label when context matters:

```tsx
<LoadingSpinner label="Loading students..." />
```

### Form Inputs

Use `state="error"` with error messages:

```tsx
<div>
  <Input state="error" aria-describedby="email-error" />
  <p id="email-error" className="text-sm text-accent-red mt-1">
    Invalid email address
  </p>
</div>
```

---

## Color System Migration

The project uses two color systems:

### Primary: Notion Design System (Preferred)
- `text-text-primary`, `bg-surface-primary`, `border-border-default`
- RGB format: `rgb(var(--token) / <alpha-value>)`

### Legacy: shadcn/ui (For Compatibility)
- `text-foreground`, `bg-background`, `border-input`
- HSL format: `hsl(var(--token))`

**Migration Path**: New components should use Notion tokens. Legacy shadcn tokens remain for existing component compatibility.

---

## Sidebar Context

The sidebar collapse state is managed globally through `SidebarContext`:

```tsx
import { useSidebar } from "@/lib/sidebar-context"

function MyComponent() {
  const { isCollapsed, toggleSidebar, setCollapsed } = useSidebar()

  return (
    <div className={cn(
      "transition-all duration-300",
      isCollapsed ? "ml-16" : "ml-64"
    )}>
      {/* Content */}
    </div>
  )
}
```

**Features**:
- `isCollapsed`: boolean - Current collapse state
- `toggleSidebar()`: Toggle collapse state
- `setCollapsed(boolean)`: Set specific state
- localStorage persistence (key: `lms-sidebar-collapsed`)
- Hydration-safe (avoids SSR/CSR mismatch)

**Usage in TeacherOS**:
- `TeacherOSLayout`: Wraps content with `SidebarProvider`
- `Sidebar`: Responsive width w-64 → w-16
- `MainContent`: Dynamic margin ml-64 → ml-16

---

## Files Reference

| File | Content |
|------|---------|
| `tailwind.config.js` | Token definitions, breakpoints |
| `app/globals.css` | CSS variables (light/dark) |
| `components/ui/grid.tsx` | Grid component |
| `components/ui/container.tsx` | Container component |
| `components/ui/input.tsx` | Input with state variants |
| `lib/sidebar-context.tsx` | Sidebar collapse state management |
| `components/os/Sidebar.tsx` | TeacherOS sidebar with collapse |
| `components/layout/mobile-nav.tsx` | MobileNav with Compact Mode |
