%(supplementary)

# Backend API Audit — `api/` gateway

Scope: `api/index.ts` (Vercel serverless router), `api/_lib/handlers.ts` (handlers), `api/_lib/airtable.ts` (Airtable CRUD + TABLE constants), `api/_lib/auth.ts`. Cross-checked against frontend types `src/lib/types.ts`, client `src/lib/api.ts`, and usage in `src/components/EmployeeDashboard.tsx` + `src/components/TeamLeadDashboard.tsx`.

## 1. REST API contract stability for a frontend-only refactor

**Verdict: Mostly stable, but NOT safe to refactor purely client-side.** The route table in `api/index.ts` is explicit, one-route-per-handler, and consistent in its success/error envelope (`{ status, data }`, with `data` mirroring the handler payload). That part is refactor-safe.

Two contract landmines block a no-backend change:

- **Dead handlers / silently-dropped query params.** `handleGetCalendar(params)` and `handleGetAnnouncements(params)` are *imported* by `index.ts` but **never routed**. `GET /calendar` is wired to `handleGetAllCalendar()` (no params), so any `?date=YYYY-MM-DD` query is silently ignored and the client always receives the *entire* Calendar table. `GET /announcements` always routes to `handleGetAllAnnouncements()` (no `?limit=`). A refactored frontend that assumes date/limit filtering (matching the handler signatures) will compile but get unfiltered payloads.
- **Fragile path parsing.** `index.ts` derives `path` from `req.url` plus a `req.query.path` fallback with several regex prefix-strips. Works today but is brittle; any rewrite of routing should be validated against the exact set of handlers listed above.

## 2. Response-shape inconsistencies between handlers

| # | Where | Inconsistency | Refetch impact |
|---|-------|---------------|----------------|
| 1 | `handleCreateEntry` (lines 180-235) | `results` is built as **flat** `{ id, ...created.fields }`, but the announcement builder reads `results[0].fields.FilledAt` and `r.fields.CompletionPct` (nested). Both are `undefined`, so the live-feed `Announcement.Message` always renders `"…0% completion"` and `"… at now"`. | `GET /announcements` returns corrupted completion text for every entry announcement. |
| 2 | `handleCreateEntry` vs `EmployeeDashboard`/`TeamLeadDashboard` | Frontend caps `completionPercent` at **999** (`Math.min(999, …)`); backend computes `CompletionPct = Math.round(actual/planned * 100)` **uncapped** (no `min`). | A refetched `EodEntry` can show `CompletionPct` far above 100% (e.g. 200%), diverging from the in-form 999 cap the user saw pre-submit. |
| 3 | `handleLogin` (first-login branch vs normal) | First-login success returns `{ token, employee, forcePasswordChange, message }`; normal login returns `{ token, employee, forcePasswordChange }` — `message` is dropped. `AuthResponse` type declares neither optional `message`. | Type drift; first-login UX reads a field the normal shape doesn't carry. |
| 4 | `handleCreateCalendarEntry` / `handleGetAllCalendar` | Calendar's date field stored as **`"Day Type"`** (with a space); create endpoint maps body `DayType → "Day Type"`, list returns it flat-spread as `Day Type`. No `Calendar` type exists in `src/lib/types.ts`, so the frontend types it `any`. | Any frontend typed access to `DayType` (consistent with the rest of the PascalCase schema) returns `undefined` on refetch. |

**Count: 4** response-shape/logic inconsistencies.

## 3. Recommended backend improvement (highest leverage)

Expose level-progression metadata from the **gamification** (and/or employees) endpoint.

The frontend currently **duplicates the entire XP→level table** in `src/lib/utils.ts#calculateLevel` (lines 45-81) to render the Level Progression ring — computing `currentXp`, `nextLevelXp`, and `progress` client-side from `gamification.xp`. The backend already owns that exact mapping in `handlers.ts#calculateLevel` (lines 343-361) but `handleGetGamification` only returns `xp`, `level`, `levelTitle`.

**Change:** add `nextLevelXp`, `currentXpInLevel`, and `progressToNextLevel` (or a single `levelProgress` object) to `handleGetGamification`'s response. This removes the copy-pasted level table from the frontend, guarantees the progress ring matches the server's level thresholds, and removes a real drift risk (the two tables are currently identical by luck, not by design).

## 4. Schema verification: `airtable.ts` vs `src/lib/types.ts`

`airtable.ts` defines only **table names** (`TABLES`) and generic CRUD helpers — it carries no field schema. The effective schema lives in the handlers' field reads/writes. Cross-checking those against `types.ts`:

- **Employees** — `sanitizeEmp` reads `Name, Email, Role, Active, FirstLogin, XP, Level, LevelTitle, CurrentStreak, LongestStreak, TotalEntries` and maps them to the `Employee` type. ✅ Match.
- **EOD_Entries** — `handleGetEntries` returns `{ id, ...fields }` containing `EmployeeName, Date, Project, Task, Description, PlannedQty, ActualQty, CompletionPct, Complexity, Remarks, Rating, RatingRemarks, FilledAt, XpAwarded` — matches `EodEntry`. ✅ Match.
- **Leaves** — `EmployeeName, Date, Reason, MarkedBy` matches `Leave`. ✅ Match.
- **Earned_Badges** — `EmployeeName, BadgeName, DateEarned, IsNew` matches `EarnedBadge`. ✅ Match.
- **WorkItem (input only)** — frontend sends camelCase (`projectName, plannedQty, actualQty, completionPercent, complexity`); backend reads the camelCase keys but **ignores `completionPercent`** and recomputes `CompletionPct`. ✅ Matches shape, ⚠️ logic diverges (see §2).
- **Calendar / Announcements / Notifications / PushSubscriptions / Game_Badges** — **no types in `src/lib/types.ts`**; frontend treats them as `any`. ⚠️ Calendar additionally uses the irregular `Day Type` field name (see §2 #4).

## Summary

- Contract is explicit but not refactor-safe: remove the dead `handleGetCalendar`/`handleGetAnnouncements` handlers (or route them so `?date=`/`?limit=` work) before relying on them client-side.
- Fix the `results[].fields` access bug in `handleCreateEntry` so entry announcements embed the correct completion % and filled time.
- Unify `CompletionPct` clamping between client and server.
- Add `Calendar`/`Announcement`/`Notification` types to `src/lib/types.ts` (and normalize `Day Type → DayType`).
- Expose level-progression metadata from the gamification endpoint to eliminate the frontend's duplicated level table.
