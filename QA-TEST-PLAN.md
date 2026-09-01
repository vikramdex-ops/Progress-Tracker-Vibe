# QA Test Plan — Progress-Tracker-Vibe GUI Overhaul

**Scope:** GUI-only acceptance testing of the Progress-Tracker-Vibe React 19 + TypeScript + Vite + TailwindCSS v4 + React Router v7 frontend against Airtable-backed API gateway. Two roles: `employee`, `team_lead`. Auth: session token in localStorage.

**Legend:** Severity — Critical / High / Medium / Low. Type — Automated (unit/integration) or Manual (interactive).

---

## 1. Login Flow Edge Cases

| # | Scenario | Expected | Severity | Type |
|---|----------|----------|----------|------|
| L-1 | User opens app with no token (fresh browser) | Redirected to `/login`, login form displayed | High | Manual |
| L-2 | First-login temp password submitted correctly | Temp-password form accepts token, prompts for new password, creates session, redirects to role-appropriate route | Critical | Manual |
| L-3 | Temp password used without new password set | Form rejects submission, inline error "new password required", no session created | High | Automated |
| L-4 | Temp password expired (server returns 410) | Clear message "temp password expired, request new one", link to forgot-password | High | Manual |
| L-5 | Forgot password clicked from login | Team lead notified via backend, confirmation banner "reset instructions sent"; no token created | High | Manual |
| L-6 | Wrong password submitted 1× | Inline error "invalid credentials", session not created, form remains | High | Automated |
| L-7 | Wrong password submitted 5 failed attempts | Account lockout / rate-limit 429 surfaced as "too many attempts, try again in N seconds" | Critical | Manual |
| L-8 | Email field empty, password filled | Submit disabled or inline validation "email required" | Low | Automated |
| L-9 | Password field empty, email filled | Submit disabled or inline validation "password required" | Low | Automated |
| L-10 | Both fields empty, submit clicked | Both fields flagged, submit not triggered | Low | Automated |
| L-11 | Expired session token present in localStorage (server 401 on API call) | Silently cleared, redirect to `/login`, no crash | Critical | Manual |
| L-12 | Inactive account logs in (backend returns account status flag) | Message "account inactive, contact your team lead" | High | Manual |
| L-13 | Login with valid creds + `success` URL param | Redirect to intended deep route after login instead of default | Medium | Manual |
| L-14 | Login form submitted via Enter key | Same behavior as clicking Submit | Low | Automated |

---

## 2. EOD Entry Form Edge Cases

| # | Scenario | Expected | Severity | Type |
|---|----------|----------|----------|------|
| E-1 | New work-item row added, left entirely empty, Submit clicked | Row flagged "work item required" or auto-removed; submission blocked | High | Automated |
| E-2 | Work item present, actual hours > planned hours | Accepted (overrun permitted), row highlighted amber, total delta shown | Medium | Automated |
| E-3 | Planned qty = 0 for an item, actual qty filled | Completion % computed as 100% (or N/A), no divide-by-zero crash | Critical | Automated |
| E-4 | Add a new work-item row (plus button / Enter) | Empty row appends; focus moves to first input; form remains valid | Low | Manual |
| E-5 | Remove a work-item row | Row removed from DOM; totals recompute; at least one row remains | Medium | Manual |
| E-6 | Remove the last remaining work-item row | Either prevented or a fresh empty row auto-inserted | Low | Manual |
| E-7 | Auto-describe AI fails (500/network timeout) | Descriptive text blank, manual fields still editable, non-blocking toast "AI description unavailable" | Medium | Manual |
| E-8 | Submit clicked while browser fully offline | Submit disabled or "offline, changes saved locally" banner; no crash | Critical | Manual |
| E-9 | Submit partial completion (1 of 3 items filled) for a day with no prior entry | Accepted as valid partial entry; total completion reflects actual/planned | Medium | Automated |
| E-10 | Submit with all items 100% actual == planned | Green indicator, completion 100% | Low | Automated |
| E-11 | Work item description contains only whitespace | Treated as empty; flagged or auto-trimmed | Low | Automated |
| E-12 | Duplicate the same work item twice | Both rows accepted (no uniqueness rejection at UI) | Low | Manual |

---

## 3. Routing / Access Control

| # | Scenario | Expected | Severity | Type |
|---|----------|----------|----------|------|
| R-1 | Unauthenticated user navigates to `/dashboard` | Redirect (302) to `/login` with `?next=/dashboard` | Critical | Manual |
| R-2 | Unauthenticated user navigates to `/team` | Redirect to `/login?next=/team` | Critical | Manual |
| R-3 | `team_lead` logs in | Session role = team_lead, routed to `/team`, nav shows Team link | High | Manual |
| R-4 | `employee` logs in | Session role = employee, routed to `/dashboard`, Team link hidden/absent | High | Manual |
| R-5 | Employee navigates directly to `/team` in address bar | Redirect to `/dashboard` (403 → redirect), no data leaked | Critical | Manual |
| R-6 | Employee refreshes page while on `/team` URL | Same as R-5 (server/guard re-evaluates role on mount) | Critical | Manual |
| R-7 | `team_lead` refreshes `/team` | Stays on `/team`, data reloads from Airtable | Low | Manual |
| R-8 | Unknown route `/foo/bar` | Fallback 404 page with "return home" link | Low | Manual |
| R-9 | `/login` visited while authenticated | Redirect to role-default route | Medium | Manual |
| R-10 | Deep link `/team?user=123` shared with employee | Employee redirected away; no cross-user data exposure | High | Manual |

---

## 4. Mobile Responsiveness

| # | Scenario | Expected | Severity | Type |
|---|----------|----------|----------|------|
| M-1 | Viewport iPhone SE (375×667), login form | Email/password stacked vertically; inputs ≥44px tap target; Submit full-width | High | Manual |
| M-2 | EOD form on iPhone SE | Each work-item field on own row; Add/Remove buttons ≥44px; no horizontal scroll | High | Manual |
| M-3 | Work-items table (≥4 columns) on mobile | Horizontal scroll container; columns not collapsed/truncated illegibly | Medium | Manual |
| M-4 | Chatbot dock on mobile | Dock collapses to bottom-right icon; expands to 90vw sheet; tap outside dismisses | Medium | Manual |
| M-5 | Leave-confirmation tap target | "Stay"/"Leave" buttons ≥44×44px, spaced ≥8px apart | High | Manual |
| M-6 | Theme toggle in mobile nav drawer | Visible and tappable (≥44px) in header or drawer | Low | Manual |
| M-7 | Zoom/scaling: pinch-zoom on form inputs (iOS) | Inputs do not break layout; `target-density` meta prevents over-zoom | Medium | Manual |
| M-8 | Landscape orientation on iPhone SE | Layout adapts; no content clipped under keyboard | Low | Manual |

---

## 5. Dark / Light Theme

| # | Scenario | Expected | Severity | Type |
|---|----------|----------|----------|------|
| T-1 | Toggle theme via header switch | `prefers-color-scheme` token flips; all components re-render with new palette within one frame | Medium | Manual |
| T-2 | Theme preference toggled then page reloaded | Persisted choice applied before first paint; no flash of wrong theme | High | Manual |
| T-3 | Theme stored in localStorage key `theme` = `dark`/`light` | Value matches last selection and is consumed by TailwindCSS v4 `dark:` variant | High | Automated |
| T-4 | System-prefers-dark + user has never toggled | Resolves to dark on first mount | Medium | Manual |
| T-5 | All semantic tokens (background, surface, text, accent, border, error) | Correct luminance contrast ≥4.5:1 in both modes (WCAG AA) for body text | Medium | Manual |
| T-6 | Chatbot/dock styling in dark mode | Correct contrast; icons tinted per palette | Low | Manual |

---

## 6. AI Quiz Edge Cases

| # | Scenario | Expected | Severity | Type |
|---|----------|----------|----------|------|
| Q-1 | Daily quiz limit reached (e.g. 3 attempts/day) | "Daily limit reached, try again tomorrow" banner; quiz locked | High | Manual |
| Q-2 | AI quiz request times out (5s) | "AI took too long" message; retry button enabled; no partial state | Medium | Manual |
| Q-3 | Wrong answer selected | Marked incorrect, correct answer revealed, "retake" offered | Low | Automated |
| Q-4 | Retake quiz within same day (limit not yet hit) | New question set served; previous attempt history preserved in UI | Medium | Manual |
| Q-5 | Network error during quiz fetch | "Couldn't load quiz, check connection" with retry; offline-aware | Medium | Manual |
| Q-6 | Quiz component renders while token missing | Falls back to placeholder, no crash | Low | Automated |

---

## Execution Notes

- **Automated coverage target:** L-3, L-6, L-8/9/10/14, E-1, E-3, E-10, E-11, T-3, Q-3, Q-6 (via Vitest + React Testing Library + `jsdom` + `msw` for Airtable API mocking).
- **Manual coverage:** All Critical + High scenarios plus full mobile matrix on real iOS Safari + Chrome Android.
- **Device matrix (manual):** iPhone SE (375×667), Pixel 5 (412×915), iPad Air (1024×1366).
- **Routing tests** use React Router v7 guard components + mocked `localStorage` role token; refresh tests require full browser (Cypress/Playwright).
