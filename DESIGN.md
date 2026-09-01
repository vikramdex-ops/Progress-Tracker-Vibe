---
name: Progress Tracker
version: 1.0
description: Daily EOD entry tracker for Dexterity Design Services — office staff, piping/engineering context, gamified with Calm Glass visual language.
platforms: [web]
ice: true
---

## Overview

Internal web app (Operate mode) for office staff to record daily work entries: planned vs actual quantity, project/task, complexity, remarks — with auto-generated live-feed announcements, XP/level gamification, team-lead review, calendar, push reminders, and AI quiz. Already running on Vite 6 + React 19 + TailwindCSS v4 with a custom OKLCH token system ("Calm Glass"), dark mode, and RRv7 routing.

This is a **refinement/extension** of an incumbent system — the design tokens, components (`primitives.tsx` barrel with Surface/Button/Badge/Notification), and `App.tsx` routing are already built. Only `DESIGN.md` was missing; it is now being carbonized from `src/index.css`, `src/components/ui/primitives.tsx`, `PREMAM-DESIGN-SPEC.md`, and the running `dist/` build.

Mode: **Operate** — users complete a task in a tool interface. Scanability, consistency, and native desktop expectations come before expression. Brand lives in precise details (glass surfaces, OKLCH brand-indigo, amber/emerald semantic colors, subtle shadow tokens, 4-level radius scale).

## Colors

All colors use OKLCH (wide-gamut, perceptually uniform) defined in `src/index.css`. Light and dark semantic variants are separate `:root` vs `.dark` assignments.

**Brand / primary**

- brand-500: `oklch(0.550 0.170 264)` — the single primary. Used for links, active nav, progress bars, primary buttons, badges.
- brand-400: `oklch(0.640 0.135 264)` — hover state of primary elements.
- brand-600: `oklch(0.490 0.160 264)` — pressed/active.
- brand-50/100/200/300: light tint steps for surfaces, badges, subtle backgrounds.
- brand-700/800/900: deep steps for dark-mode text, strong borders.

**Semantic (derived from brand + amber + emerald + red)**

- progress / completion: `oklch(0.730 0.155 160)` (emerald family) — represents entry completion.
- alert / error: `oklch(0.740 0.200 25)` (red family) — errors, failed submissions.
- success: `oklch(0.640 0.160 160)` (emerald-500) — saved/confirmed states.
- warning: amber-500 (`oklch(0.660 0.175 70)`).
- info: brand-500.
- text-primary / text-secondary / text-muted: neutral 950 / 600 / 400 in light; 50 / 400 / 500 in dark.
- bg / surface / surface-hover / surface-strong / surface-glass: neutral family with transparency variants for "glass" surfaces (`rgba` over light backgrounds in light mode; `rgba` over dark backgrounds in dark mode).

**Dark mode override** (`.dark`): swaps `bg` to near-black (`oklch(0.075 0.002 260)`), `surface` to slightly lifted dark, `text-primary` to near-white (`oklch(0.982 0.003 260)`), and all semantic colors keep the same hue but at similar lightness shifted for dark readability.

Anti-patterns avoided (per `craft-floor.md` / Impeccable): no Inter default, no purple-to-blue gradient, no nested cards, no pure black/gray (all tinted with OKLCH neutral), no bounce easing, no gray-on-colored text.

## Typography

Single font family (system sans / Inter replacement if installed) with tight hierarchy via CSS custom properties mapped in `@theme`.

- Display / page title: large, medium weight (font-weight: 500–600), tight line-height (1.1–1.2).
- Section / component headings (SurfaceTitle, Header): medium (1.25–1.5rem), 500 weight.
- Body / labels (entry descriptions, remarks): 1rem (16px), 400 weight, line-height 1.5, neutral-600 (light) / neutral-400 (dark).
- Small / meta (timestamps, badges, counts): 0.875rem, 500 weight for counts, 400 for dates.
- Navigation / tab labels: uppercase or small-caps option available via utility; currently title-case for accessibility.

No decorative serif; no over-wide display font. The Calm Glass system favors precision over personality.

## Layout

**Page structure (AppShell)**

- Fixed `Header` at top (logo/title + nav + role indicator + avatar). Height ~64px.
- `main` content below with `max-w-7xl` (or full-width for dashboards) and consistent padding (`px-6 py-8` on desktop, `px-4 py-4` on mobile).
- Bottom spacing preserved via `min-h-[calc(100vh-64px)]` so empty states never feel broken.

**Dashboard layout (Employee / Team Lead)**

- Two-column on desktop: left ~2/3 for main activity (entry form / review list / live feed), right ~1/3 for side cards (gamification status, calendar, quick links).
- Single-column stack on mobile (< 1024px).
- Grid for entry cards / announcement rows: 1 column on mobile, 2 on tablet, 3 on desktop for review lists.

**Form layout (Entry)**

- Multi-item form: each item is a section with Project / Task / Description / Planned / Actual / Complexity / Remarks fields.
- OverallRemarks at bottom.
- Submit button spans full width at bottom on mobile, right-aligned in form area on desktop.
- Labels above fields (not placeholders) for accessibility.

**Spacing tokens**

From `DESIGN-SYSTEM.md` §4.2 / `index.css` `@theme` mapping: `spacing-1` = 4px, `spacing-2` = 8px, `spacing-3` = 12px, `spacing-4` = 16px, `spacing-6` = 24px, `spacing-8` = 32px, `spacing-12` = 48px. No arbitrary pixel values outside this scale.

## Elevation & Depth

Calm Glass uses subtle elevation rather than heavy shadow nesting.

- Surface (default): flat, `bg-surface`.
- Glass / elevated: `bg-surface-glass` with `backdrop-filter: blur(12px)` equivalents and very thin borders (`border-color: --color-border`). Used for header bars, card headers, notification toasts.
- Progress / status bars: flat, no shadow — color-only with thin background track (`bg-neutral-100` / `bg-neutral-800` dark).
- Shadow tokens (from design spec): shadow-sm (soft), shadow-md (medium, for floating cards/notifications), shadow-lg (reserved for modal/overlay — not yet used).
- No nested cards inside cards. One level of surface per component.

## Shapes

From `DESIGN-SYSTEM.md` §4.3 / `@theme` mapping:

- `rounded-sm`: 4px — badges, small tags.
- `rounded-md`: 8px — buttons, input fields, card bodies.
- `rounded-lg`: 12px — large surfaces, modal-style cards.
- `rounded-xl`: 16px — rare; reserved for featured/hero elements (not used in this internal tool).
- `rounded-full`: pill buttons, avatar circles.
- Button shapes: `rounded-md` default (not fully rounded — keeps tool-like precision).
- Card shapes: `rounded-lg` for main cards, `rounded-md` for inner sections (headers, footers).
- Input shapes: `rounded-md` with `border-2` on focus (focus ring uses `border-focus` = brand-400).

## Components

### Surface (primitives.tsx)

`Surface` is the base card. Variants: `default`, `glass` (backdrop blur + translucent bg), `progress`, `completion`, `alert`, `brand`. Each has Header / Title / Content / Footer sub-components. All use the token-derived colors and rounded values above.

- Default: `bg-surface`, `border-border`, `rounded-lg`, padding via `spacing` scale.
- Glass: `bg-surface-glass`, thin border, subtle shadow-md.
- Progress / Completion: flat color backgrounds (`completion` green-tinted, `alert` red-tinted) with percentage text.
- Brand: `bg-brand-50` (light) / tinted dark; used for primary actions/hero cards.

### Button (primitives.tsx)

5 intents (primary, secondary, success, warning, danger) × 3 styles (solid, outline, ghost) × 4 sizes (sm, md, lg, icon). All use `rounded-md` and `font-medium`. No pure-black text. Primary uses brand-500; hover uses brand-400.

### Badge (primitives.tsx)

5 intents × 3 styles (solid, outline, soft). Small, pill-shaped (`rounded-full`) or square (`rounded-md`) depending on context. Used for status, role, complexity level, completion status.

### Notification / Toast (primitives.tsx — ToastProvider / useNotification)

Built on `@radix-ui/react-toast`. ToastContainer positioned fixed bottom-right (or centered on mobile). Individual toasts: `rounded-lg`, `bg-surface-glass`, `shadow-lg`, with title + message. Auto-dismiss with progress bar. Role = `status` by default.

### LoginPage (component)

Single-page form: email + password + "Forgot?" link. Minimal header. Form card centered vertically, max-w-md. Uses Surface (glass) around the form.

### Header (component)

Fixed top bar. Logo/title left, navigation links center/right, role indicator + avatar far right. Uses `bg-surface-glass` with subtle bottom border.

### EmployeeDashboard / TeamLeadDashboard

Dashboard surfaces with side cards (gamification, calendar, notifications). Main content dominates at ~65% width. Side cards at ~35%. All cards use Surface with consistent margin (spacing-6 between cards).

### Entry Form / Review Grid

Form: vertical stack of inputs with labels above. Review grid: rows of card-style items with completion %, rating buttons, remarks preview. No nested cards — each entry is one Surface; meta (date, name, project) live inside the content area.

## Do's and Don'ts

**Do**

- Use the OKLCH primitive palette; never invent new hexes outside `index.css`.
- Use `rounded-md` or `rounded-lg` for cards/buttons; reserve `rounded-full` for pills/avatars.
- Use `Surface` variants rather than inventing new card styles.
- Keep light/dark consistency: check `.dark` equivalents when adding new components.
- Preserve the glass + flat combination: glass for floating/header elements, flat for content surfaces.
- Use semantic colors with text labels — never color-only for critical status.

**Don't**

- Don't use pure black (#000) or pure gray (#808080) — always tint with OKLCH neutral.
- Don't nest cards inside cards (one level of Surface per component).
- Don't use purple-to-blue gradients or bounce easing anywhere (per anti-patterns).
- Don't introduce new font families (system sans / the installed Inter is the only approved face).
- Don't put gray text on colored backgrounds (brand surfaces use dark text; dark surfaces use light text).
- Don't add shadow to flat progress/status bars — color track + number is sufficient.
- Don't invent new component variants outside `Surface`, `Button`, `Badge`, `Notification` — extend via props or new sub-components, not new shapes.

---

## See Also

- **DESIGN-SYSTEM.md** — Full component specification, migration map, acceptance checklist
- **ARCHITECTURE-REVIEW.md** — Architecture decisions and technical review (Enthiran)
- **BACKEND-AUDIT.md** — Backend security audit (Kaithi)

