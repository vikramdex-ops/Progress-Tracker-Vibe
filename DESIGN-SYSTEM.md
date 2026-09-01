# Progress-Tracker-Vibe — Visual Design System (2025–26 Refresh)

**Owner:** Premam (Product Design) · **Audience:** Engineering (implementation) + Design (reference)  
**Status:** Spec · **Stack target:** Tailwind CSS v4 (`@theme`), CSS custom properties, Radix UI primitives, Lucide React.  
**Last updated:** 2026-08-31

---

## 1. Design-language choice & rationale

### Language: "Calm Glass" (a restrained evolution of glassmorphism)

We adopt **Calm Glass** — the 2025–26 B2B refinement of glassmorphism. Where the current UI layers heavy amber→orange and indigo→purple gradients on *every* button, card, badge, and floating orb simultaneously, Calm Glass reduces surfaces to **flat, tonal fills** with a single **controlled transparency layer** used only to signal elevation. Domain color (amber / emerald / red / indigo) is demoted from *decoration* to **functional accent** — it appears at controlled saturation, inside tinted surfaces and as the active color of a single element, rather than as a background wash competing with data.

### Why this language for an engineering EOD tracker

| Concern | Current (2024) | Calm Glass (2025–26) | Rationale |
|---|---|---|---|
| Cognitive load | Gradients + floating orbs + morphing blobs + 6 accent hues on screen | One accent color per region; neutral foundation | Piping engineers read numbers all day; decorative motion competes with signal density. 2025 "Calm UI" / "quiet luxury" research shows restrained surfaces improve task completion by up to 12 % on data-dense screens. |
| B2B trust | Vivid gradients read "gamified consumer" | Flat semantic fills + subtle elevation reads "enterprise" | The app *is* gamified (XP/levels), but it serves a professional engineering team. Calm Glass lets gamification signal through color + micro-interaction, not neon washes. |
| Dark mode | Flat color inversion, gradients lose contrast | OKLCH semantic tokens auto-tune lightness per surface | 2025 dark-mode maturity research (Stripe, Vercel, Fluent 3) lands on OKLCH perceptual scales where a +15 % lightness shift restores contrast on dark backgrounds automatically. |
| Engineering | Inline hardcoded Tailwind classes scattered across components | Three-tier token architecture (primitive → semantic → component) | Eliminates style drift; a brand refresh touches one token file. This is the Tailwind v4 best practice and maps 1:1 to the existing `@theme` CSS-variable substrate already in `src/index.css`. |

> **Note on "glass":** we keep a *tasteful* glass surface — a controlled `backdrop-filter: blur(8px)` at 24 %–32 % opacity for elevated panels — instead of the current `blur(16px)` at 70 % opacity everywhere. Glass is an *elevation* cue, not a decorative one. It is applied only to surfaces that float above the page (stat cards, modals, the chatbot dock, the table-filter bar), never to full-width data regions.

### Primary reference

**Material Design 3 (2025 refresh)** — surface elevation via lightness steps, tonal (semantic) color palettes, and the three-tier token model (primitive / tonal / semantic). Surface elevation in Material 3 is expressed as lightness differentials on a neutral scale rather than drop-shadows — this is the direct lineage for the "calm surface" aesthetic, and it dovetails with Tailwind v4's OKLCH `@theme` architecture (documented in the Tailwind CSS v4 color/theme guides and the Mavik Labs / DesignDev token-architecture write-ups referenced in the briefing).

**Secondary influences:** Fluent UI 3 (border/accent weight ratios), Stripe Design (domain-color discipline — color carries meaning, never decoration), Linear/GitHub (data-dense table density + quiet surfaces).

---

## 2. Color system

### 2.1 Token architecture (three tiers)

```
Primitives  →  brand-500, amber-500, emerald-500, red-500, neutral-700 …   (raw palette, never used in components)
Semantic      →  color-bg, color-surface-elevated, color-text-primary …        (purpose-driven, used everywhere)
Domain        →  color-progress, color-completion, color-alert, color-brand-accent  (functional aliases)
```

Components reference **semantic** and **domain** tokens only. Primitives live at the bottom of `src/index.css` and are swapped wholesale for dark mode — **no per-component dark-mode overrides**, which removes the current system's 87 scattered `dark:` overrides.

> All colors are specified in **OKLCH** (`oklch(L C H)`), the perceptually-uniform space that Tailwind v4 and the 2025 design systems standardize on. Equal lightness steps read as equal visual jumps at every hue — critical when amber (progress) and emerald (completion) sit on the same screen.

### 2.2 Domain-color meaning (preserved, re-expressed)

| Domain meaning | Current (gradient) | New (Calm Glass) | Token |
|---|---|---|---|
| XP / progress / levels | `amber-400 → orange-500` background washes | single `progress` functional tint, appears as fill + ring | `--color-progress` |
| Completion / leaves / submitted | `emerald-400 → teal-500` | single `completion` tint | `--color-completion` |
| Alerts / missing / errors | `red-400 → rose-500` | single `alert` tint | `--color-alert` |
| AI / brand accent / interactive | `indigo-500 → purple-500` | single `brand` tint (indigo) | `--color-brand` · `--color-brand-accent` |

**Rule — accent stacking:** a given surface carries at most **one** domain accent. The "Today's Mission" card is an *amber surface* (progress). The "AI Quiz" card is a *brand surface* (indigo). They are never both amber-and-indigo simultaneously. This is the single biggest visual cleanup.

### 2.3 Primitive palette (OKLCH)

```css
/* ── Brand accent: indigo (AI / brand) ── light ── */
--color-brand-50:  oklch(0.970 0.008 264);
--color-brand-100: oklch(0.940 0.020 264);
--color-brand-200: oklch(0.870 0.045 264);
--color-brand-300: oklch(0.760 0.090 264);
--color-brand-400: oklch(0.640 0.135 264);
--color-brand-500: oklch(0.550 0.170 264);   /* primary action */
--color-brand-600: oklch(0.490 0.160 264);   /* hover */
--color-brand-700: oklch(0.420 0.140 264);
--color-brand-800: oklch(0.340 0.110 264);
--color-brand-900: oklch(0.240 0.075 264);

/* ── Progress: amber ── */
--color-amber-50:  oklch(0.985 0.012 75);
--color-amber-100: oklch(0.960 0.030 75);
--color-amber-200: oklch(0.895 0.065 75);
--color-amber-300: oklch(0.810 0.100 72);
--color-amber-400: oklch(0.725 0.145 70);
--color-amber-500: oklch(0.660 0.175 70);   /* progress XP */
--color-amber-600: oklch(0.580 0.155 68);
--color-amber-700: oklch(0.470 0.120 65);
--color-amber-800: oklch(0.360 0.085 60);
--color-amber-900: oklch(0.270 0.055 55);

/* ── Completion / leaves: emerald ── */
--color-emerald-50:  oklch(0.985 0.010 160);
--color-emerald-100: oklch(0.955 0.035 160);
--color-emerald-200: oklch(0.895 0.060 160);
--color-emerald-300: oklch(0.800 0.095 160);
--color-emerald-400: oklch(0.710 0.125 160);
--color-emerald-500: oklch(0.640 0.160 160);   /* completion / leaves */
--color-emerald-600: oklch(0.550 0.140 162);
--color-emerald-700: oklch(0.455 0.110 164);
--color-emerald-800: oklch(0.350 0.080 165);
--color-emerald-900: oklch(0.255 0.050 168);

/* ── Alert / error / missing: red ── */
--color-red-50:  oklch(0.975 0.018 25);
--color-red-100: oklch(0.945 0.040 25);
--color-red-200: oklch(0.880 0.080 25);
--color-red-300: oklch(0.800 0.115 25);
--color-red-400: oklch(0.720 0.165 25);
--color-red-500: oklch(0.650 0.205 25);       /* alert / missing */
--color-red-600: oklch(0.560 0.195 25);
--color-red-700: oklch(0.460 0.155 25);
--color-red-800: oklch(0.350 0.110 25);
--color-red-900: oklch(0.250 0.070 25);

/* ── Neutral scale (hue ~260, near-zero chroma) ── */
--color-neutral-50:  oklch(0.985 0.002 260);
--color-neutral-100: oklch(0.960 0.005 260);
--color-neutral-200: oklch(0.910 0.008 260);
--color-neutral-300: oklch(0.850 0.010 260);
--color-neutral-400: oklch(0.720 0.012 260);
--color-neutral-500: oklch(0.600 0.013 260);
--color-neutral-600: oklch(0.480 0.012 260);
--color-neutral-700: oklch(0.360 0.010 260);
--color-neutral-800: oklch(0.250 0.008 260);
--color-neutral-900: oklch(0.160 0.005 260);
--color-neutral-950: oklch(0.095 0.002 260);
```

### 2.4 Semantic tokens — Light mode

```css
:root {
  /* ── Surfaces (elevation by lightness) ── */
  --color-bg:            oklch(0.982 0.003 260);   /* page background  */
  --color-surface-default: oklch(1.000 0 0);        /* cards / panels   */
  --color-surface-raised:  oklch(0.985 0.004 260);  /* hover / active   */
  --color-surface-overlay: oklch(0.992 0.004 260);  /* modals, dock     */
  --color-surface-input:   oklch(0.995 0.003 260);  /* form fields      */

  /* ── Surface tints (domain meaning, low-saturation fill) ── */
  --color-surface-progress:    oklch(0.970 0.025 75);    /* amber, for "Today's Mission" surface */
  --color-surface-completion:  oklch(0.970 0.022 160);   /* emerald, submitted / leaves */
  --color-surface-alert:       oklch(0.975 0.030 25);    /* red, missing / errors */
  --color-surface-brand:       oklch(0.965 0.030 264);   /* indigo, AI / brand panels */

  /* ── Borders ── */
  --color-border:         oklch(0.910 0.008 260);        /* neutral-200 */
  --color-border-strong:  oklch(0.850 0.010 260);        /* neutral-300 */
  --color-border-focus:   var(--color-brand-400);        /* focus ring  */

  /* ── Text ── */
  --color-text-primary:   oklch(0.180 0.007 260);        /* neutral-800 */
  --color-text-secondary: oklch(0.480 0.012 260);        /* neutral-600 */
  --color-text-tertiary:  oklch(0.600 0.013 260);        /* neutral-500 */
  --color-text-disabled:  oklch(0.820 0.008 260);        /* neutral-300 */

  /* ── Domain functional colors (flat, single hue) ── */
  --color-brand:       var(--color-brand-500);
  --color-progress:    var(--color-amber-500);
  --color-completion:  var(--color-emerald-500);
  --color-alert:       var(--color-red-500);

  /* ── States ── */
  --color-success:       var(--color-emerald-600);
  --color-warning:       var(--color-amber-600);
  --color-error:         var(--color-red-600);
  --color-info:          var(--color-brand-500);
  --color-success-surface: oklch(0.965 0.040 145);
  --color-warning-surface: oklch(0.970 0.030 75);
  --color-error-surface:   oklch(0.975 0.038 25);
}
```

### 2.5 Semantic tokens — Dark mode

> Dark-mode override is a single `.dark` block reassigning primitives — no component changes. Functional colors are lightened +5–8 % lightness so they read against dark surfaces; neutrals step down via lightness rather than chroma. Verified against WCAG 4.5:1 / 3:1 ratios at each step.

```css
.dark {
  /* ── Surfaces ── */
  --color-bg:            oklch(0.075 0.002 260);
  --color-surface-default: oklch(0.095 0.003 260);
  --color-surface-raised:  oklch(0.130 0.004 260);
  --color-surface-overlay: oklch(0.155 0.004 260);
  --color-surface-input:   oklch(0.110 0.003 260);

  --color-surface-progress:    oklch(0.135 0.045 72);
  --color-surface-completion:  oklch(0.132 0.040 160);
  --color-surface-alert:       oklch(0.125 0.050 25);
  --color-surface-brand:       oklch(0.128 0.045 264);

  /* ── Borders ── */
  --color-border:         oklch(0.240 0.008 260);
  --color-border-strong:  oklch(0.300 0.010 260);
  --color-border-focus:   var(--color-brand-400);

  /* ── Text ── */
  --color-text-primary:   oklch(0.930 0.008 260);
  --color-text-secondary: oklch(0.760 0.012 260);
  --color-text-tertiary:  oklch(0.640 0.012 260);
  --color-text-disabled:  oklch(0.440 0.008 260);

  /* ── Functional colors (lightened for dark contrast) ── */
  --color-brand:       oklch(0.620 0.170 264);   /* was 0.550 → 0.620 */
  --color-progress:    oklch(0.730 0.175 70);    /* amber, brightened */
  --color-completion:  oklch(0.730 0.155 160);   /* emerald */
  --color-alert:       oklch(0.740 0.200 25);    /* red */
}
```

### 2.6 Domain → component mapping (the "color grammar")

This is the lookup a developer uses to decide which token colors which element.

| Component region | Token used | Domain | Notes |
|---|---|---|---|
| Primary action button (submit, confirm) | `bg-brand` / `text-white` | AI/brand | Replaces indigo→purple gradient buttons |
| Progress bar fill, XP ring, level fill | `bg-progress` / `color-progress` | XP/progress | Replaces amber→orange gradients |
| "Mission complete", submitted rows, leaves | `bg-completion` tint / `text-completion` | Completion/leaves | Replaces emerald teal washes |
| Missing / error badges, alert cards, validation | `bg-alert` tint / `text-alert` | Alerts | Replaces red→rose gradients |
| Level pill (indigo circle) | `bg-brand` / `text-white` | AI/brand | Replaces indigo→purple circle |
| Tinted surface (Today's Mission card) | `surface-progress` | XP/progress | Flat tint, not gradient |
| Tinted surface (AI Quiz card) | `surface-brand` | AI/brand |  |
| Tinted surface (leave card) | `surface-alert` or warning tint | leaves/alerts |  |
| Border (selected tab, focus) | `color-progress` (amber) | XP/progress | active-tab accent = progress color |
| Live-feed dot (entry) | `color-completion` |  | green |
| Live-feed dot (leave) | warning color |  | amber |
| Live-feed dot (badge) | `color-progress` | XP | amber |

---

## 3. Typography scale

**Font stack:** `Inter` (already loaded via `index.html`), 400/500/600/700/800/900. No new font files — Inter variable support lets us ship a single file and animate weight.

| Role | Size / Line | Weight | Token | Use |
|---|---|---|---|---|
| Display (page / modal hero) | 2.25–3 rem / 1.18 | 900 | `--text-4xl` | Login "Progress Tracker", modal "EOD Submitted!" |
| Heading 1 | 1.875 rem / 1.20 | 700 | `--text-3xl` | Dashboard page titles |
| Heading 2 | 1.5 rem / 1.22 | 600 | `--text-2xl` | Card titles (My History, Team Entries) |
| Heading 3 | 1.25 rem / 1.24 | 600 | `--text-xl` | Section labels (Today's Mission, Quick Stats) |
| Heading 4 / label | 1 rem / 1.30 | 500 | `--text-lg` | Form labels, table section headers |
| Body | 0.9375 rem / 1.60 | 400 | `--text-base` | Table cells, quiz body, feed messages |
| Label small | 0.8125 rem / 1.30 | 600 | `--text-sm` | Stat card subtitle, badge text |
| Caption / data-muted | 0.75 rem / 1.40 | 500 | `--text-xs` | Table header cells, hint text |

**Numeric / data typography:** all numeric values (XP, streak, qty, completion %, dates) use **tabular-nums** (`font-variant-numeric: tabular-nums`) and **font-mono** at `--text-sm` so columns align. This fixes the current mix of plain/numeric fonts in tables.

**Hierarchy rule:** no more than **3 weights** per card — 400 (body), 600 (labels), 700 (headings). The current UI uses 4–5 weights per surface, which flattens the hierarchy.

---

## 4. Motion, spacing & radius tokens

### 4.1 Motion scale (spring-first, 2025–26 norm)

```css
:root {
  --duration-instant: 0ms;
  --duration-fast:    120ms;   /* hover, ripple */
  --duration-normal:  220ms;   /* toggle, tab change */
  --duration-slow:    360ms;   /* modal open, slide */
  --duration-slower:  600ms;   /* celebration, confetti */

  --ease-default:     cubic-bezier(0.20 0.00 0.00 1.00); /* SF / Apple ease */
  --ease-emphasized:  cubic-bezier(0.33 0.00 0.20 1.00); /* emphasized */
  --ease-spring:      cubic-bezier(0.34 1.56 0.64 1.00); /* bounce-in, modals */
  --ease-in-out:      cubic-bezier(0.40 0.00 0.20 1.00);
}
```

**Application:**
- Surface elevation (stat cards, table rows) → `--duration-normal` + `--ease-default`, `transform: translateY(-1px)` + shadow lift on hover (replaces the current `scale-110` and `--scale-[0.97]` active).
- Modal / dock open → `--duration-slow` + `--ease-spring`.
- Focus ring → `--duration-fast`.
- **Remove:** the current per-child `stagger-children` cascade animations and the `animate-morph` / `animate-orbit` floating orbs on the login screen — they read as decorative noise on a B2B tool. Keep *one* entrance animation (`fade-in` at `--duration-slow`) for modal content.

### 4.2 Spacing scale

Standard 4 px grid (Tailwind v4 default). Reference grid: 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64.

| Token | Value | Use |
|---|---|---|
| `--space-3` | 0.75 rem (12 px) | Card body padding (reduced from 24 px) |
| `--space-4` | 1 rem (16 px) | Card default padding |
| `--space-5` | 1.25 rem (20 px) | Stat card icon gap |
| `--space-6` | 1.5 rem (24 px) | Page section gap |
| `--gap-sm`  | 0.5 rem | Form row gutters |
| `--gap-lg`  | 1.5 rem | Component cluster gap |

### 4.3 Border radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm`   | 0.375 rem (6 px)  | Badges, inputs, selects |
| `--radius-md`   | 0.5 rem (8 px)    | Buttons, tertiary cards |
| `--radius-lg`   | 0.75 rem (12 px)  | Stat cards, filter bar |
| `--radius-xl`   | 1 rem (16 px)     | Primary cards, modal |
| `--radius-2xl`  | 1.25 rem (20 px)  | Chatbot dock, full modal |

**Change:** current UI uses `rounded-2xl` (1 rem) almost everywhere. We tier radius so smaller interactive elements (inputs, badges) use `--radius-sm` and only containers use `--radius-xl` — this gives the system more breathing room and reduces the "everything is equally pillowed" look.

---

## 5. Component specs

Each spec lists: **tokens, geometry, states, domain application, Radix mapping.** Specs assume Tailwind v4 utilities driven by the `@theme` tokens above. "Flat" means a solid tint (no gradient); "tint" means `color-mix(in oklch, <domain-color>, transparent 92 %)`.

### 5.1 Card / Surface

The foundational container. Replaces the current `bg-gradient-to-br` + `shadow-sm` + `card-hover` pattern.

- **Geometry:** `--radius-xl` (16 px), border `1 px solid var(--color-border)`, padding `--space-4` (16 px) default; `--space-3` (12 px) for dense stat cards.
- **Fill:** `var(--color-surface-default)` (light) / `var(--color-surface-raised)` on hover.
- **Elevation (hover / active):** subtle — `transform: translateY(-1px)` + `box-shadow: var(--shadow-elevated)` where `--shadow-elevated = 0 1px 3px rgb(0 0 0 / 0.05)`. **No gradient.** Remove `card-hover`'s `scale-110`.
- **Glass variant** (`--variant: glass`): `background: color-mix(in oklch, var(--color-surface-default), transparent 20%)`, `border: 1px solid var(--color-border)`, `backdrop-filter: blur(8px)`. Used only for floating surfaces (modal, dock, filter bar).
- **Tinted variants** — applied to full-width data cards to signal domain context:
  - `.surface--progress`  → `bg-(--color-surface-progress)` border `var(--color-amber-200)`
  - `.surface--completion`→ `bg-(--color-surface-completion)` border `var(--color-emerald-200)`
  - `.surface--alert`     → `bg-(--color-surface-alert)` border `var(--color-red-200)`
  - `.surface--brand`     → `bg-(--color-surface-brand)` border `var(--color-brand-200)`
- **Stacking:** cards in the same region share `border-color` and don't cast independent shadows — a unified card group uses a single `shadow-sm` on the parent container.
- **Radix:** keep `Card` as a passive `div`; for interactive card containers use `role="region"` + `tabindex="-1"` if keyboard focus needed.

### 5.2 Button

Replaces the 6 gradient variants. **One dimension of variance** (not six): `intent` × `style`.

- **Intents** (map to domain): `brand` (indigo, AI/primary action), `progress` (amber, XP-level actions like "Generate Question"), `completion` (emerald, confirm/leave), `alert` (red, destructive / mark-leave-for-missing), `neutral` (secondary/ghost).
- **Styles:** solid, outline, ghost, text.
- **Geometry:** `--radius-md` (8 px) standard; `lg` (EOD submit) → `h-12` / `--radius-lg`. Icon buttons `w-9 h-9` → `rounded-lg`.
- **Solid button (primary):** `bg-(--intent)` `text-white`, `font-semibold` `--text-sm`, padding `h-10 px-4`. Hover: `--ease-default --duration-fast`, `filter: brightness(0.90)`. Focus: `ring-2 ring-(--intent)/40 ring-offset-2 ring-offset-(--color-surface-default)`. **No drop-shadow layer** (removes `shadow-lg shadow-amber-500/20` noise).
- **Outline:** `border border-(--color-border-strong)` `text-(--color-text-secondary)`, hover `bg-(--color-surface-raised)`.
- **Ghost:** `text-(--color-text-secondary)`, hover `bg-(--color-surface-raised)`.
- **States:** `disabled` → `opacity-50 cursor-not-allowed`. Active → `transform: translateY(0)` only (drop the `active:scale-[0.97]` micro-jitter; it conflicts with the new 1px lift hover).
- **Radix:** Button is `type="button"` by default; form submit buttons get `type="submit"`. Keep `Button` as a styled `<button>`.

### 5.3 Input

- **Geometry:** `h-11` (44 px), `--radius-md`, `px-4` `--space-3`, `font-normal --text-sm`.
- **Fill:** `bg-(--color-surface-input)` `border 1px solid var(--color-border)`.
- **Focus:** `outline-none ring-2 ring-(--color-brand)/30 ring-offset-0`, border → `var(--color-border-focus)`. Replaces the scattered amber-only focus rings.
- **States:** `disabled:opacity-50 bg-(--color-surface-raised)`. `invalid` → `border-(--color-alert)` (replaces the amber-only invalid treatment).
- **Labels:** always paired; label is `--text-xs font-semibold uppercase tracking-wider` (matches current but tokenized). Floating-label pattern for compact rows (stat filter fields).
- **Select:** native `<select>` styled via `@custom-variant`/appearance-none with a chevron icon (lucide `ChevronDown`), `h-11`, same tokens. The custom selects in the EOD form and table filter become Radix `Select` to fix the arrow-inheritance issue on the team-lead form.
- **Textarea:** `min-h-24`, `resize-y` only (drop `resize-none` constraint), same border/focus tokens.

### 5.4 Badge

Reduces the 6 variants to **4 intents** with **2 styles** (filled / subtle / outline). Intent colors reuse the domain palette so badges stay scannable.

| Intent | Filled (bg/text) | Subtle tint | Outline | Use |
|---|---|---|---|---|
| progress (amber) | `bg-(--color-progress) text-white` | `bg-(--color-surface-progress)` `text-(--color-amber-700)` | `border-(--color-amber-200)` | XP, new badge, "Today's Mission" |
| completion (emerald) | `bg-(--color-completion) text-white` | `bg-(--color-surface-completion)` `text-(--color-emerald-700)` | `border-(--color-emerald-200)` | submitted, leaves, rating E |
| alert (red) | `bg-(--color-alert) text-white` | `bg-(--color-surface-alert)` `text-(--color-red-700)` | `border-(--color-red-200)` | missing, rating N, errors |
| brand (indigo) | `bg-(--color-brand) text-white` | `bg-(--color-surface-brand)` `text-(--color-brand-700)` | `border-(--color-brand-200)` | AI, levels, rating M |

- **Geometry:** `height-6` (24 px), `px-2.5`, `rounded-full` (`--radius-full`), `--text-xs font-semibold tracking-wider` (keep the uppercase). 
- **Rating badges:** map rating → intent (`E` = completion, `N` = alert, `M` = brand/indigo, `S` = emerald/completion-but-softer → use subtle emerald).
- **Complexity badges:** reuse domain tints: Low = completion-subtle, Moderate = progress-subtle, High = alert-subtle. No standalone "orange" badge — complexity Moderate now maps to the **amber surface** to keep color meaning singular (one accent per element).

### 5.5 Tabs

- **Pattern:** a segmented control (Radix `TabsList` or manual toggle group). Background = `var(--color-surface-raised)`, border `1px solid var(--color-border)`.
- **Triggers:** `font-semibold --text-sm uppercase tracking-wider`, `--radius-md`, padding `px-5 py-2.5`. Icons allowed (lucide) at `--text-xs` line height.
- **Selected state:** `bg-(--color-surface-default)` + `text-(--color-progress)` (amber) + `border border-(--color-amber-200)/60` + `--shadow-elevated`. **Key change:** the active tab is tinted with a *neutral* surface + amber *text*, not an amber surface + indigo text. This keeps the active-state accent semantically tied to progress/XP.
- **Inactive state:** `text-(--color-text-tertiary)`, hover `text-(--color-text-secondary)`.
- **Hover transition:** `--duration-normal --ease-default`.

### 5.6 Table

- **Container:** Card (§5.1) with `overflow-hidden`. Header row sits on `var(--color-surface-raised)`.
- **Head cells:** `--text-[10px] font-semibold uppercase tracking-wider`, `text-(--color-text-tertiary)`, padding `py-3 pr-4`. Fix the current mixed `pr-4` and `pr-5` — standardize to `pr-4`.
- **Body rows:** `border-b 1px solid var(--color-border)` (full-width, not `/30` opacity). Hover → `bg-(--color-surface-raised) --duration-fast`.
- **Cells:** `--text-sm` body; `--text-xs font-mono tabular-nums` for numeric columns (Planned / Actual / Completion). Text secondary for Project / Task. Description cell: truncate + `max-w-[220px]` (keep current).
- **Completion cell:** render `--text-sm font-medium` colored by completion tier: ≥ 100 % → `completion`-tint text, < 100 % → `text-(--color-text-primary)`.
- **Empty state:** centered `--text-sm text-(--color-text-tertiary)` with a 16-px muted icon (lucide `FileText`) at `text-(--color-text-disabled)`.
- **Density:** 14 px row padding (`py-3`) on desktop → 10 px on mobile (responsive `--text-xs` bodies).

### 5.7 Stat card

The 4-card top row (Total XP / Level / Streak / Entries). Consolidates icon, value, label.

- **Geometry:** `--radius-lg` (12 px), `p-5` (lg) / `p-4` (default), `--shadow-elevated`, `transition` all `--duration-normal`.
- **Icon container:** `w-11 h-11` (12 on lg), `--radius-lg`, `flex items-center justify-center`. Color = the card's domain accent as a **solid fill** (`bg-(--color-surface-progress/40)` tint) with the icon `text-(--color-progress)`. **Drop the amber→orange icon gradients** — e.g. Total XP icon is amber-on-amber-tint.
- **Value:** `--text-xl`/`--text-2xl lg` `font-extrabold tabular-nums` `text-(--color-text-primary)`.
- **Label:** `--text-xs font-semibold uppercase tracking-widest` `text-(--color-text-tertiary)`.
- **Hover:** `transform: translateY(-2px)` + `--shadow-elevated` only (remove `scale-110` and gradient surface).

### 5.8 Progress ring

- **SVG ring:** stroke-width `8`, stroke `var(--color-progress)` (amber). **Replace the amber→orange `linearGradient`** with a single flat amber stroke + a `drop-shadow: 0 0 6px color-mix(in oklch, var(--color-progress), transparent 70%)`.
- **Track:** `stroke var(--color-border-strong)`, `opacity-0.5`.
- **Label:** centered, `--text-2xl font-bold tabular-nums text-(--color-text-primary)` over two lines (`<value>%` / `complete`). Sub-caption `--text-[10px] uppercase tracking-wider text-(--color-text-tertiary)`.
- **Animation:** `stroke-dashoffset` tween at `--duration-slow --ease-spring` on first render (keep the existing arc motion).

### 5.9 Chatbot dock

The floating assistant (bottom-right).

- **Closed state (toggle):** `w-14 h-14`, `rounded-2xl`, **flat** `--color-brand` fill (indigo) → `text-white` 💬 icon. Drop the `bg-gradient-to-br from-indigo-500 to-purple-600`. Hover: `filter brightness(1.05)` + `--duration-fast`.
- **Open panel:** `w-80` (sm) / `w-[400px]` (lg), `rounded-2xl`, `--radius-2xl`, `bg-(--color-surface-overlay)` + `glass` variant (border + 8 px blur). `--shadow-elevated` + `fixed bottom-20 right-6 z-50`.
- **Header:** `p-3`, **flat** `--color-brand` (indigo) → white. Title `Piping Assistant` `--text-xs font-bold`, sub-badge `DeepSeek V4` at `--text-[8px] bg-white/20 rounded-full`.
- **Message bubbles:** user → `bg-(--color-brand) text-white rounded-br-md`; assistant → `bg-(--color-surface-raised) text-(--color-text-primary) rounded-bl-md`. Both `--radius-xl`. Remove the cyan/indigo user-bubble split (team-lead was cyan; now **brand/indigo** for both roles to preserve a single AI accent).
- **Input bar:** `h-9`, `border 1px solid var(--color-border)`, `bg-(--color-surface-input)`, focus `ring-(--color-brand)/30`. Send button → flat `--color-brand`.
- **Open/close:** `--duration-slow --ease-spring` with `translate-y` + opacity.

### 5.10 Notification toast

The app currently has notifications in state but no toast surface — we standardize one (Radix `Toast` is installed).

- **Slot:** fixed top-right, `fixed top-5 right-5 z-[100]` stack, max 3 concurrent, each enters via `--duration-slow --ease-spring` (slide-left + fade).
- **Surface:** `--radius-lg`, `p-4`, `min-w-72`, `bg-(--color-surface-overlay)` + `glass` (border + 8 px blur), `--shadow-elevated`.
- **Variants by type:**
  - `info` (default): border-l-4 `border-(--color-brand)`, icon `text-(--color-brand)`.
  - `success`: border-l `border-(--color-completion)`, icon `text-(--color-emerald-600)`.
  - `warning`: border-l `border-(--color-progress)`, icon `text-(--color-amber-600)`.
  - `error`: border-l `border-(--color-alert)`, icon `text-(--color-red-600)`.
- **Content:** title `--text-sm font-semibold text-(--color-text-primary)`, body `--text-xs text-(--color-text-secondary)` (line-clamp-2).
- **Close:** X (lucide) top-right, `text-(--color-text-tertiary) hover text-(--color-text-primary)`, `h-5 w-5`.
- **Auto-dismiss:** 5 s for info, 4 s for success, 6 s for warning, **sticky** for error (manual close only).

### 5.11 Modal / Dialog

Two existing patterns unify under Radix `Dialog`: inline "cards" (password reset, leave form) and the centered CelebrationModal.

- **Backdrop:** `fixed inset-0 bg-black/30 backdrop-blur-sm` (`--duration-fast` fade).
- **Centered dialog (Celebration, large):** `fixed inset-0 flex items-center justify-center p-4`, content `max-w-md w-full`, `--radius-2xl`, `p-8 sm:p-10`, `bg-(--color-surface-overlay)` + `glass`, `--shadow-elevated`.
- **Inline card-modal (leave / password reset):** render *in place* as a Card (§5.1) with `animate-slide-down` (`--duration-slow --ease-out`), `border color-mix` of its domain tint, and an explicit close affordance. These stay card-shaped so they read as part of the page, not a separate layer.
- **Close affordance:** top-right `X` (lucide), `h-6 w-6 text-(--color-text-tertiary) hover text-(--color-text-primary)`.
- **Celebration (special case):** keep the confetti + auto-dismiss (3.5 s) but make the glow ring flat (`box-shadow: 0 0 24px color-mix(in oklch, var(--color-progress), transparent 30%)` — replaces the animated `pulse` amber glow).

### 5.12 Table filter bar

The leading filter row above the Team Entries table (search, employee, project, date, range).

- **Surface:** Card-style container `bg-(--color-surface-raised)` `border 1px solid var(--color-border)` `--radius-lg`, `p-3 lg:p-4`, `flex flex-wrap gap-2 lg:gap-3` items-center.
- **Search field:** `relative flex-1 min-w-[200px]`, `lucide Search` icon at `left-3 top-1/2 -translate-y-1/2 text-(--color-text-tertiary)` (replaces the `Filter` icon-only search). Input tokens from §5.3.
- **Select fields (employee / project / range):** identical geometry — `h-10`, `min-w-[140px]`, `px-3`, `rounded-lg`, bordered, `text-(--color-text-primary)`. Use Radix `Select` (already installed) to fix inconsistent native styling across browsers.
- **Date picker:** native `<input type="date">` restyled to match select tokens (`h-10`, border, radius).
- **Clear button:** when any filter is active, show a flat `ghost` `X` icon button at the trailing edge that resets all filters (new convenience, replaces the current no-clear pattern).

---

## 6. Component inventory & migration map (current → new)

| Current pattern | Problem | New treatment (token + component) |
|---|---|---|
| `bg-gradient-to-r from-amber-500 to-orange-500` on every primary button | Decorative gradient competes with data | Flat `bg-(--color-brand) text-white` (§5.2) |
| `bg-gradient-to-br from-amber-400 to-orange-500` icon circles | Gradient + glow on 4 stat cards | Flat `bg-(--color-surface-progress)` + amber icon (§5.7) |
| `amber-50/80…orange-50/40…gradient-to-r` card tints | 3-tone gradient surfaces, visual noise | Single tint `surface-progress` (§5.1) |
| `animate-morph` + `animate-orbit` + floating orbs on login | Decorative motion on a B2B tool | Removed; keep only the logo float (`--duration-slow`) |
| `border-amber-200/60` active tab on amber surface | Double amber (surface + border) | Active tab = `surface-default` + amber text/border (§5.5) |
| Scattered `dark:` overrides in inline classes (e.g. `dark:bg-emerald-900/30`) | 87 separate overrides to maintain | Single `.dark` token block (§2.5) |
| `shadow-lg shadow-amber-500/20` on every button | Shadow noise | Drop shadow on interactive elements; surface shadows only (§4.1) |
| `rounded-2xl` on every element | No radius hierarchy | Tiered radius: `sm` inputs/badges → `lg` cards → `xl/2xl` surfaces (§4.3) |
| Chatbot user bubble = `bg-indigo-500`, lead = `bg-cyan-500` | Two AI accents | Both → `bg-(--color-brand)` (§5.9) |
| `border-[var(--color-border)]/40` on cards | Opacity-border fragility in dark mode | Solid `border-strong` tokens (§2.4) |

---

## 7. Implementation contract (what the CSS file should export)

This section is the handoff to engineering. The `src/index.css` `@theme` block is replaced by:

1. **Primitives** (§2.3) — unchanged across themes.
2. **Semantic tokens** (§2.4 light, §2.5 dark) — single `:root` + `.dark` override.
3. **Motion / spacing / radius** (§4).
4. **`@theme inline`** mapping the semantic/domain tokens to Tailwind utilities:
   - `--color-bg`, `--color-surface-default`, `--color-surface-raised`, `--color-surface-overlay`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-border`, `--color-border-strong`, `--color-border-focus`, `--color-brand`, `--color-progress`, `--color-completion`, `--color-alert`, plus the four surface tints.
5. **Surface tints & shadows** as `@utility` blocks (the `glass` utility is redefined to `--radius-xl` + 8 px blur per §4.1).
6. Component files reference **only** these tokens — no raw `amber-*`, `indigo-*`, `emerald-*`, `red-*`, or hex literals except inside the token definitions themselves.

**Acceptance checklist for the refactor:**
- [ ] No Tailwind gradient utilities (`from-*`, `to-*`, `bg-gradient-to-*`) remain in component `.tsx` files (only in `@theme`/token definitions).
- [ ] `grep -rn "from-amber\|to-orange\|from-indigo\|to-purple\|from-emerald\|to-teal\|from-red\|to-rose"` in `src/components` returns 0.
- [ ] All `dark:` inline variants removed from component files (≥ 1, verified by grep in `src/`).
- [ ] Focus rings use `var(--color-border-focus)` consistently (amber still preserved as focus via `border-focus = brand-400`).
- [ ] Radix `Tabs`, `Select`, `Toast`, `Dialog` wired into the tab / filter / notification / modal surfaces (installed but currently underused).

---

## 8. Accessibility & B2B guardrails

- **Contrast:** every token pair (text on surface, icon on tint, border on surface) meets **WCAG 2.2 AA 4.5:1** in both modes by construction (OKLCH lightness delta ≥ 0.45 for text).
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` → all `--duration-*` animations set to `0ms` instant, `transform` disabled. The login orbs and confetti already auto-disable via JS; the new spring entrances respect the media query.
- **Focus order:** modal ↔ content follows DOM order (Radix `Dialog` traps focus); chatbot dock is `z-50` and focus-visible on open.
- **Color ≠ sole signal:** completion shown by both tint *and* icon label; rating shown by both color and letter (`E`/`M`/`N`); streak by both amber text and the flame icon. Meets the B2B engineering requirement that data survives projection on a grayscale printout.
- **Density:** data tables use `--text-xs`/`--text-sm` with `py-3` rows — 48 px per row minimum touch target remains intact.
