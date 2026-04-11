# Frontend Design Reference

## Responsive Layout Patterns

### Container

```tsx
<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
```

### Card Grid

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
  {items.map((item) => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

### Stack (vertical spacing)

```tsx
<div className="flex flex-col gap-4 sm:gap-6">
```

### Sidebar Layout

```tsx
<div className="flex flex-col lg:flex-row lg:gap-8">
  <aside className="w-full lg:w-64 shrink-0">...</aside>
  <main className="min-w-0 flex-1">...</main>
</div>
```

## Typography Scale

| Use                  | Tailwind                            | Approx  |
| -------------------- | ----------------------------------- | ------- |
| Page title           | `text-3xl sm:text-4xl font-bold`    | 30–36px |
| Section title        | `text-xl sm:text-2xl font-semibold` | 20–24px |
| Card/Component title | `text-lg font-medium`               | 18px    |
| Body                 | `text-base`                         | 16px    |
| Small/caption        | `text-sm text-muted-foreground`     | 14px    |

## Spacing Scale

- **Tight**: `gap-2`, `p-2` (8px)
- **Default**: `gap-4`, `p-4` (16px)
- **Relaxed**: `gap-6`, `p-6` (24px)
- **Loose**: `gap-8`, `p-8` (32px)

## Animation Variants (Framer Motion)

```tsx
const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};
```

## Accessibility Quick Wins

- `role="button"` + `tabIndex={0}` + `onKeyDown` for div buttons
- `aria-label` on icon-only buttons
- `aria-live="polite"` for dynamic content updates
- `focus:ring-2 focus:ring-offset-2` for focus visibility

## Common Pitfalls to Avoid

| Avoid                         | Prefer                                           |
| ----------------------------- | ------------------------------------------------ |
| `h-screen` on mobile          | `min-h-dvh` or `min-h-[100dvh]`                  |
| Fixed pixel widths            | `min-w-0`, `max-w-*`, `w-full`                   |
| `!important`                  | Increase specificity or refactor                 |
| Inline styles for layout      | Tailwind classes                                 |
| Nested flex without `min-w-0` | Add `min-w-0` to flex children that can overflow |
