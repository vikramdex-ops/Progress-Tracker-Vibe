# Progress-Tracker-Vibe

> Daily EOD progress tracker for **Dexterity Design Services** — piping/engineering team workflow with gamification, live feed, and team-lead review.

Internal web app for office staff to record daily work entries: project, task, planned/actual quantity, complexity, remarks — with auto-generated live-feed announcements, XP/level progression, streak tracking, and team-lead review. Replaces manual spreadsheets and ad-hoc messaging with a single structured record of what happened each day.

## ✨ Features

- **Daily EOD entries** — multi-item form per submission (project, task, description, planned/actual, complexity, remarks)
- **Gamification** — XP awarded per submission (base + early-bird + 100%-completion bonus), 10 progression levels (Piping Trainee → Piping Wizard), streak tracking, earned badges
- **Live feed** — every entry, leave, or system event auto-posts to the team's announcement feed
- **Team-lead review** — rate entries, manage leaves, manage calendar, approve password resets, view team analytics
- **Push reminders** — server-side checks each day for employees who haven't filled on a working day
- **AI engineering quiz** — daily piping/engineering questions via NVIDIA MiniMax M3 with per-employee history
- **EOD insights + weekly report** — AI-generated summaries using DeepSeek
- **Dark mode + light mode** — both ship, OKLCH-based

## 🏗️ Architecture

```
Progress-Tracker-Vibe/
├── api/                    Vercel serverless functions
│   ├── index.ts            Single router for all /api/* endpoints
│   └── _lib/
│       ├── handlers.ts     ~40 Airtable-backed handlers
│       ├── airtable.ts     Airtable client + table map
│       ├── auth.ts         Session token, password hash, parseBody
│       └── nvidia.ts       NVIDIA MiniMax M3 quiz generator
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   └── primitives.tsx    Surface, Button, Badge, Notification
│   │   ├── LoginPage.tsx
│   │   ├── Header.tsx
│   │   ├── EmployeeDashboard.tsx
│   │   └── TeamLeadDashboard.tsx
│   ├── lib/
│   │   ├── auth.ts               useAuth hook, session storage
│   │   ├── airtable.ts           API client
│   │   ├── types.ts              TypeScript types (Employee, Entry, GamificationData, ...)
│   │   └── utils.ts
│   ├── App.tsx                   Router + role guards
│   ├── index.css                 Calm Glass design system (OKLCH tokens)
│   └── main.tsx
├── PRODUCT.md                    Product truth (per Impeccable spec)
├── DESIGN.md                     Visual design system (per Impeccable spec)
├── DESIGN-SYSTEM.md              Premam's full design spec
├── ARCHITECTURE-REVIEW.md         Enthiran's architecture review
├── BACKEND-AUDIT.md              Kaithi's backend bug list (all fixed)
└── QA-TEST-PLAN.md               Ratchasan's QA plan
```

## 🧰 Stack

- **Frontend:** React 19 + Vite 6 + TypeScript + TailwindCSS v4
- **Routing:** React Router v7 (data-router with role-gated routes)
- **Backend:** Vercel serverless functions (`api/index.ts`)
- **Database:** Airtable (Employee, Entry, Leave, Calendar, Notification, Announcement, PushSubscription, EarnedBadge, Settings, QuizHistory tables)
- **AI:** NVIDIA MiniMax M3 (quiz generation), DeepSeek (EOD insights, weekly reports, chat)
- **Design system:** Custom OKLCH "Calm Glass" tokens in `src/index.css`

## 🎨 Design System

Calm Glass — a 3-tier token architecture: **primitives** → **semantic** → **domain**, all in OKLCH for perceptually uniform color.

- Brand: indigo 264 hue family
- Semantic: emerald (completion), red (alert), amber (warning), brand (info)
- Light + dark theme with full token swap
- Glass surfaces via translucent backgrounds + thin borders
- 4-step radius scale (4/8/12/16px), no nested cards
- No pure black, no purple-to-blue gradients, no bounce easing

See [DESIGN.md](./DESIGN.md) and [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) for the full system.

## 🚀 Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build to dist/
npm run preview    # Preview the production build
```

## 🧪 Verifying

```bash
npx tsc --noEmit   # Type check (0 errors expected)
npm run build      # Production build
```

## 📋 Documentation

- [PRODUCT.md](./PRODUCT.md) — product truth, user context, positioning
- [DESIGN.md](./DESIGN.md) — visual design system (carbonized from code)
- [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) — full design spec from Premam
- [ARCHITECTURE-REVIEW.md](./ARCHITECTURE-REVIEW.md) — architecture review by Enthiran
- [BACKEND-AUDIT.md](./BACKEND-AUDIT.md) — backend bug audit by Kaithi
- [QA-TEST-PLAN.md](./QA-TEST-PLAN.md) — QA plan by Ratchasan

## 👤 Credits

- **Product:** Progress Tracker for Dexterity Design Services
- **Created by:** Vikram
- **Design system:** Premam (Calm Glass)
- **Architecture review:** Enthiran
- **Backend audit:** Kaithi
- **QA plan:** Ratchasan
- **Design review framework:** [Impeccable](https://impeccable.style)
