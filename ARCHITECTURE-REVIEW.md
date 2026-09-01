# Architecture Review — Progress-Tracker-Vibe GUI Overhaul

**Reviewer:** Enthiran (systems architect) · **Scope:** `src/` + `api/` (`C:\Users\vikram\projects\Progress-Tracker-Vibe`)
**Stack:** Vite 6 · React 19 · TS · TailwindCSS v4 · React-Router-DOM v7 (declared, unused) · Airtable REST backend (`api/index.ts`)

---

## 1. Top 3 Architecture Risks

| # | Risk | Evidence (file:line) | Impact | Severity |
|---|------|----------------------|--------|----------|
| **R1** | **Role-based conditional rendering masquerading as routing** — the app has no URL state. `App.tsx:33-40` switches `EmployeeDashboard`/`TeamLeadDashboard` purely off `user.role` via `useAuth()`. There is no deep-link support, no back-button handling, no not-found route, and no redirect guard. `react-router-dom@^7.4.0` sits in `package.json:33` but is dead weight. | `src/App.tsx:33-40`; `package.json:33` | Deep links / refreshes on a dashboard view 404 or land on login; browser back/forward is broken; bookmarks impossible; onboarding/SSR impossible. | **High** |
| **R2** | **Two ~1,000-line dashboard monoliths with duplicated domain state** — `EmployeeDashboard` is 1,036 lines (`src/components/EmployeeDashboard.tsx:1-500+`), `TeamLeadDashboard` is 1,165 lines (`src/components/TeamLeadDashboard.tsx:1-500+`). Both re-declare the same slices: `workItems`, `submitting`, `quiz`/`quizAnswer`/`quizResult`/`quizStats`/`quizHistory`/`generatingQuiz`, `chatOpen`/`chatMessages`/`chatInput`/`chatLoading`, `announcements`, `calendar`, `activeTab`. No shared hooks; state is local to each page component. | `src/components/EmployeeDashboard.tsx:24-56`; `src/components/TeamLeadDashboard.tsx:16-66` | Any feature change (quiz, chat, EOD submit) must be edited twice. Merge conflicts, drift, and regression risk compound. Onboarding new devs is blocked. | **High** |
| **R3** | **Token + session stored in `localStorage` with no expiry / rotation** — `src/lib/auth.tsx:27-35` hydrates the user from `localStorage.getItem("auth_user")` and `src/lib/api.ts:4-15` keeps `authToken` in a module singleton plus `localStorage`. The backend `api/_lib/auth.ts:26-44` (`verifySession`) does a raw Airtable `SessionToken` equality lookup with no TTL, no rotation, no revocation. `src/lib/auth.tsx` has no expiry field. | `src/lib/auth.tsx:25-37`; `src/lib/api.ts:3-15`; `api/_lib/auth.ts:26-44` | A leaked static token is valid forever. `AuthProvider` on load trusts the persisted blob unconditionally (no expiry check), so a stale/expired token silently renders the app. No SSR-safe cookie path. | **Medium-High** |

> **Side-lobed note (not in top-3):** `convex/` (9 files mirroring Employees/Entries/EOD/Gamification/Quiz/Calendar/Announcements) is a *second* backend implementation against the same Airtable source-of-truth. This is an active divergence risk: two query layers will drift against `api/_lib/handlers.ts` and `api/_lib/airtable.ts`. Recommend consolidating onto the single `api/index.ts` contract before the GUI rewrite (see §4).

---

## 2. Recommended Frontend Architecture

### 2.1 Routing — `react-router-dom` v7 (data routers)

Adopt **RRv7 data routers** with a single `src/routes/` tree. Keep the existing role model (`Employee` | `team_lead` from `src/lib/types.ts:5`) — do **not** rename the backend field.

**Route map (concrete):**
```
src/routes/
  root.tsx                ← Root layout: AuthProvider + theme + <Outlet />
  auth/
    login.tsx             ← /login  (replaces LoginPage.tsx inline guard)
  app/
    _auth.tsx             ← auth guard loader (redirect to /login if no token)
    dashboard.tsx         ← /dashboard (default after login, role-aware shell)
    entries/
      index.tsx           ← /app/entries (TodaysMission + WorkItem list)
    quiz/
      index.tsx           ← /app/quiz (play/history tabs)
    chat.tsx              ← /app/chat (floating + /app/chat full page)
    team/                 ← (team_lead only; guarded) entries.tsx / resets.tsx / analytics.tsx
```

**Loader example (role routing):**
- `src/routes/app/_auth.tsx` loader reads token → calls `employeesApi.list` is NOT needed; reuse the persisted `Employee` from context, branch on `user.role === "team_lead"` to render `TeamShell` else `EmployeeShell`.
- `src/components/layout/TeamShell.tsx` / `src/components/layout/EmployeeShell.tsx` — thin layouts wrapping `Header.tsx` + `<main><Outlet/></main>` + a shared `Sidebar`.
- `src/components/nav/TopNav.tsx` — extracted from `Header.tsx:37-113` (brand + clock + theme toggle + user menu), reusable across shells.

**Component boundaries (extracted from the monoliths):**

| New module | Replaces / extracts from | Responsibility |
|---|---|---|
| `src/features/eod/EodEntryForm.tsx` | `EmployeeDashboard.tsx:116-157`, `TeamLeadDashboard.tsx:245-281` | Work-item grid, `updateItem`, `handleSubmit` — **shared** by both roles |
| `src/features/eod/ProgressRingCard.tsx` | `EmployeeDashboard.tsx:358-363` + `ProgressRing.tsx` | Week-completion ring |
| `src/features/quiz/QuizView.tsx` | `EmployeeDashboard.tsx:481+` / `TeamLeadDashboard.tsx:~450+` | generate / play / history tabs (de-duped) |
| `src/features/quiz/QuizStatsBar.tsx` | `EmployeeDashboard.tsx:464-479` | score/accuracy/unique bar |
| `src/features/chat/ChatDrawer.tsx` | `EmployeeDashboard.tsx:~chat` / `TeamLeadDashboard.tsx:~chat` | floating + inline chat |
| `src/features/team/TeamStats.tsx` | `TeamLeadDashboard.tsx:363-387` | Filled/Missing/Avg/Rating stat cards |
| `src/features/team/Leaderboard.tsx` | `TeamLeadDashboard.tsx:491+` | streak leaderboard |
| `src/features/team/PasswordResets.tsx` | `TeamLeadDashboard.tsx:389-437` | pending reset requests + modal |
| `src/features/team/LeaveMarker.tsx` | `TeamLeadDashboard.tsx:439-488` | missing-today list + mark-leave |
| `src/components/CelebrationModal.tsx` | unchanged, move to `src/features/eod/CelebrationModal.tsx` | already isolated (114 lines) |

### 2.2 State management — hooks + `useSyncExternalStore` (no heavy framework)

**Server state:** Create `src/lib/store/QueryReader.ts` — a tiny `useSyncExternalStore`-backed reader over a shared cache object keyed by `(endpoint, params)`. It subscribes to a `Set<listener>` and re-renders only consumers of the changed slice. This replaces the duplicated `loadData()` `Promise.all` blocks in both dashboards.

```ts
// src/lib/store/QueryReader.ts (concept)
const cache = new Map<string, { data: any; error: any; promise: Promise<void> | null }>();
export function useQuery<T>(key: string, fn: () => Promise<T>) {
  const store = useMemo(() => ({
    subscribe(l: () => void) { cache.get(key)?.listeners?.add(l)... },
    getSnapshot() { return cache.get(key); }
  }), [key]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
```

- **UI state** stays local `useState` inside the leaf feature components (`activeTab`, `quizTab`, `showLeaveForm`, form inputs).
- **Auth state** stays in `AuthProvider` (`src/lib/auth.tsx`) but gains an `expiresAt`/refresh stub so migration is backward compatible.
- **No** Redux / Zustand / Jotai / React-Query — these are overkill for an Airtable REST surface that returns <200 rows per endpoint and mutates via simple POST/DELETE. The constraint explicitly forbids a heavy framework; `useSyncExternalStore` covers the consistency edge cases (stale reads, concurrent render) that raw `useState` + `fetch` does not.

**Why:** `src/lib/api.ts` already exposes clean namespaced clients (`entriesApi`, `quizApi`, `gamificationApi`, …). Wire them into feature hooks (`src/features/eod/useEod.ts`, `src/features/quiz/useQuiz.ts`) that return `{data, error, loading, mutate}`. The API client **itself is untouched** — see §4.

---

## 3. Recommended Design Token System

Replace the 60+ ad-hoc gradient vars in `src/index.css:3-33` with a **flat surface-elevation model** driven by CSS variables, dark-mode via the `.dark` class on `<html>`.

### 3.1 Token surface (new `src/styles/tokens.css`, imported once in `src/main.tsx`)
```css
/* Surface elevation: 0–4 steps, each step = surface + border + shadow pair */
:root {
  --surface-0: #ffffff;            /* page background */
  --surface-100: #ffffff;          /* raised card */
  --surface-200: #f8fafc;          /* hover / input fill */
  --surface-300: #f1f5f9;          /* active / selected */
  --surface-400: #e2e8f0;          /* border */

  --border-strong: #e2e8f0;
  --border-weak: #f1f5f9;

  /* Single shadow system (elevation = depth, not color) */
  --shadow-0: 0 0 0 rgba(0,0,0,0);
  --shadow-1: 0 1px 3px rgba(0,0,0,.05);
  --shadow-2: 0 4px 12px rgba(0,0,0,.06);
  --shadow-3: 0 12px 24px rgba(0,0,0,.08);

  /* Semantic color roles (NOT gradient pairs) */
  --color-primary: #f59e0b;        /* amber — XP */
  --color-primary-hover: #d97706;
  --color-secondary: #6366f1;      /* indigo — interactive */
  --color-secondary-hover: #4f46e5;
  --color-success: #10b981;        /* emerald — leaves / complete */
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-disabled: #94a3b8;
}
.dark {
  --surface-0: #0b1120;
  --surface-100: #111827;
  --surface-200: #1e293b;
  --surface-300: #273449;
  --surface-400: #1e2d3d;
  --border-strong: #1e2d3d;
  --border-weak: #162030;
  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
}
```

### 3.2 Migration of existing tokens
- **DELETE** `src/index.css` gradient vars (`--color-amber-glow`, `--color-indigo-glow`, `--color-emerald-glow`, the `bg-mesh` radial overlay, `.gradient-text`, `.gradient-text-indigo`, `.glass`, `.card-hover`). Replace with `var(--surface-*)`, `var(--shadow-*)`, and solid `var(--color-*)` roles.
- **Header theme toggle** (`Header.tsx:30-33`) already toggles `.dark` on `document.documentElement` — keep this exact mechanism; just point the var names at the new token surface.
- **Tailwind layer:** add `tailwind.config.js` — no, v4 is `@theme`-in-CSS. Instead add `src/styles/tokens.css` @import in `src/index.css` (which is imported in `src/main.tsx:4`) and register Tailwind *semantic* aliases via `@theme` so `bg-surface-100` etc. work and auto-dark.
- **Component cleanup:** `src/components/ui/button.tsx` currently hardcodes `bg-gradient-to-r from-amber-500 to-orange-500` per variant. Switch to `var(--color-primary)` solid fills for `default`/`secondary` and reserve gradients only for *decoration* (login branding panel — `LoginPage.tsx:204`). `badge.tsx`, `input.tsx`, `progress.tsx` reference `var(--color-*)` already — remap names onto the semantic set.

### 3.3 Surface/elevation rule
One rule per surface: `background: var(--surface-N)` + `border: 1px solid var(--border-strong|var(--border-weak))` + `box-shadow: var(--shadow-{1|2|3})`. No per-card gradient. This kills the 12+ bespoke `bg-gradient-to-br from-amber-50 ...` variants scattered through the two dashboards.

---

## 4. Migration Path — Backend Contract Preserved

**Constraint:** `api/index.ts` (`/api/index.ts`) and `api/_lib/handlers.ts` (`api/_lib/handlers.ts`) — the Airtable-backed handler routing ~13 endpoint groups (`auth/login`, `employees`, `entries`, `leaves`, `gamification`, `notifications`, `calendar`, `announcements`, `quiz/*`, `ai/*`, `push/*`, `password-resets`, `seed`) — **must remain unchanged**.

### What stays invariant (do NOT touch)
- HTTP contract: same paths, same `Authorization: Bearer <token>` header (`api/index.ts:77-79`), same request/response JSON shapes (`sanitizeEmp` in `handlers.ts:5-20`).
- `src/lib/api.ts` — the `apiRequest<T>` function (`src/lib/api.ts:17-46`) and all exported `*Api` objects (`authApi`, `entriesApi`, `gamificationApi`, `quizApi`, etc.) keep their exact signatures. The GUI refactor only *calls* them; it must not add endpoints.
- `AuthProvider` / `useAuth` (`src/lib/auth.tsx`) keeps `login`/`logout`/`refreshUser` signatures. `src/lib/types.ts` (`Employee`, `EodEntry`, `WorkItem`, `GamificationData`, `Leave`, `EarnedBadge`) keep field names.
- Vite API middleware (`vite.config.ts:6-23`) that proxies `/api` into `api/index.ts` — unchanged.

### Step-by-step (backward-compatible, shippable in slices)

**Phase 0 — Contract lock.** Freeze `api/_lib/airtable.ts` and `api/_lib/handlers.ts` as immutable. The `convex/` mirror is *not* the contract; ignore it for the GUI (deletion/decision is a separate infra task).

**Phase 1 — Routing skeleton.** Add `react-router-dom` v7 data router in `src/main.tsx`, wrapping `<App/>`. Route tree as §2.1. `App.tsx` becomes a thin role-router: read `useAuth().user.role`, redirect to `/app/dashboard`. `LoginPage.tsx` moves to `/login`. **Zero API changes** — `src/lib/auth.tsx` hydrates identically.

**Phase 2 — Extract shared UI state into feature hooks.** Build `src/features/eod/useEod.ts` (wraps `entriesApi`, `gamificationApi`), `src/features/quiz/useQuiz.ts` (wraps `quizApi`, `gamificationApi`). Each uses the **unchanged** `src/lib/api.ts` clients + `useSyncExternalStore` reader. The two dashboards stop duplicating `loadData()`; they consume the hooks. **No handler touched.**

**Phase 3 — Tokenize.** Swap `src/index.css` gradient vars → `src/styles/tokens.css` flat surface model. Remap existing `var(--color-*)` references (already used in `ui/button.tsx`, `ui/card.tsx`, `ui/badge.tsx`) onto the semantic set. The `Header.tsx` `.dark` toggle (`Header.tsx:30-33`) keeps the same DOM hook — only the *values* of the variables change, not the attribute.

**Phase 4 — Split the monoliths.** Decompose `EmployeeDashboard.tsx` and `TeamLeadDashboard.tsx` into the components in §2.1 table. EOD form becomes `src/features/eod/EodEntryForm.tsx` shared by both roles; quiz/chat/leaderboard de-duped. Auth + API clients remain the single source of truth.

**Phase 5 — Harden session (opt-in, non-breaking).** Extend `AuthProvider` to read `expiresAt` from the token envelope; if absent (legacy), fall back to the current persistent-blob behavior. Backend `verifySession` (`api/_lib/auth.ts:26-44`) unchanged in this phase — token rotation is flagged as a follow-up infra task because it requires an Airtable schema addition (`SessionExpiry` field) which *would* touch the backend contract and is therefore out of scope for the GUI overhaul.

### Migration contract guarantee table

| Surface | Before | After | Backend touched? |
|---|---|---|---|
| `src/lib/api.ts` | `apiRequest` + 13 `*Api` objects | identical signatures | ✗ |
| `api/index.ts` | 13 GET/POST/DELETE routes | frozen | ✗ |
| `api/_lib/handlers.ts` | `handleLogin`, `handleGetEntries`, … | frozen | ✗ |
| `src/lib/types.ts` | `Employee`/`EodEntry`/`WorkItem` etc. | frozen field names | ✗ |
| `src/App.tsx` → `src/routes/root.tsx` | role-conditional render | RRv7 redirect by role | ✗ |
| `src/components/{Employee,TeamLead}Dashboard.tsx` | 2,200 lines combined | split into 8 `features/` modules | ✗ |
| `src/index.css` | 60+ gradient vars | → `src/styles/tokens.css` flat model | ✗ |

---

## 5. One-paragraph summary

The GUI is a pre-routing Vite/React 19 app whose two dashboards are ~2,200 lines of duplicated, locally-stateful code sitting atop a stable Airtable-backed handler (`api/index.ts`). The highest-leverage fixes are: (1) install the already-declared `react-router-dom@^7.4.0` as a real data-router to kill the role-conditional in `App.tsx:33`, (2) extract the duplicated domain logic into `src/features/{eod,quiz,chat,team}` hooks backed by a `useSyncExternalStore` query cache over the *unchanged* `src/lib/api.ts` clients, and (3) flatten `src/index.css`'s 60 gradient vars into a `surface-0..400` + `shadow-{1,2,3}` + semantic `color-*` variable system while keeping `Header.tsx`'s `.dark` class toggle as the dark-mode lever. None of this touches `api/index.ts`, `api/_lib/handlers.ts`, or `api/_lib/airtable.ts`; the migration is shippable in five backward-compatible phases, and the only follow-up that *could* touch the backend (token TTL/rotation) is explicitly deferred.
