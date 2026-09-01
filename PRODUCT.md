# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite 6 + TypeScript + TailwindCSS v4 + React Router v7 + Airtable (Vercel serverless API)

## Users

Office staff at Dexterity Design Services filling out daily EOD entries on desktop/laptops. Primary user is the individual employee; secondary user is the team lead reviewing and managing the team.

## Product Purpose

A daily progress tracker that captures end-of-day work entries per employee per day, with planned-vs-actual quantity tracking, complexity ratings, team-wide live feed, gamified progression, and team-lead admin controls. It replaces manual spreadsheets and ad-hoc messaging with a single structured record of what happened each day.

## Positioning

The product's mechanism is its daily-entry lifecycle: every submission auto-generates a live-feed announcement, awards XP, updates streaks, and checks whether reminders are needed — all server-side, in one flow. A neighboring product could copy the feature list but not the tight coupling between entry submission, gamification state, and team visibility that makes the feed feel alive rather than archived.

## Operating Context

- Entries are filled once per employee per day via a multi-item form (project, task, description, planned/actual qty, complexity, remarks).
- Team leads review entries, rate them, manage leaves and calendar, and approve password resets.
- Gamification runs continuously: XP awarded per submission (base + early-bird + 100%-completion bonus), levels 1–10 with titles, streak tracking, and earned badges.
- Live feed announcements appear on every entry, leave, or system event.
- Push reminders fire when an employee hasn't filled their daily entry on a working day.
- AI engineering quiz questions are generated via NVIDIA MiniMax M3 and stored per-employee in App_Settings.
- All data lives in Airtable; the Vercel API layer (`api/index.ts`) routes requests to Airtable handlers.

## Capabilities and Constraints

- Two roles: `employee` and `team_lead`. Routes are role-gated at the router level.
- Auth via session token in `Authorization: Bearer <token>`, verified server-side against `SessionToken` on the Employee record.
- First-login flow uses a temporary password; normal login uses a password hash.
- Calendar table uses `DayType` field (normalized from Airtable's `Day Type` display name on read).
- Completion percentage is capped at 999 on both client and server.
- Gamification levels are hardcoded in `api/_lib/handlers.ts` (LEVELS const); XP thresholds are 0, 50, 150, 350, 600, 1000, 1500, 2200, 3000, 5000.
- The frontend already ships a Premam-inspired "Calm Glass" design system in `src/index.css` (OKLCH primitives, light/dark semantic tokens, Tailwind `@theme` mapping).
- Undecided: whether the "piping" gamification level titles should eventually be renamed to match Dexterity Design Services' actual industry.

## Brand Commitments

- Product name: Progress Tracker (working title)
- Company: Dexterity Design Services
- Tool created by: Vikram
- Voice: direct, professional, no marketing fluff. Internal tooling — no external branding needed.
- Industry context: piping/engineering — gamification level titles reflect this.

## Evidence on Hand

- Full source tree at `C:/Users/vikram/projects/Progress-Tracker-Vibe`
- Existing design system tokens in `src/index.css` (Premam Calm Glass)
- Backend audit at `BACKEND-AUDIT.md` (all 14 backend bugs fixed)
- Architecture review at `ENTHIRAN-ARCH-REVIEW.md`
- Design spec at `PREMAM-DESIGN-SPEC.md`
- QA plan at `RATCHASAN-QA-PLAN.md`
- No external testimonials, case studies, press, or benchmark data exist.

## Product Principles

1. Daily entries are the single source of truth; everything else (gamification, feed, reminders) derives from them.
2. Server-side logic owns data integrity; the frontend is a thin, presentational layer.
3. Consistency over novelty — the design system is a constraint, not a suggestion.
4. Internal tooling first: clarity and scanability outrank visual expression.
5. No fabricated content, testimonials, or claims — only what the product actually does.

## Accessibility & Inclusion

- WCAG 2.1 AA as the baseline for all new UI.
- Light and dark themes both ship; no color-only conveying of meaning (completion %, status, and level all have text + shape cues).
- Touch targets ≥ 44px on mobile breakpoints.