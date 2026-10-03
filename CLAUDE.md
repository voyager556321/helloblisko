# Hack Year 2026 — Project Context

## Event

Hack Year 2026, Kraków, Tauron Arena. The actual challenge/task is revealed at the event — this
repo is a platform skeleton prepared in advance so the team can start building within minutes of
the task being announced, and can switch between candidate tasks (HubMI, accessibility, smart
city, funding/ReFi, ...) without rebuilding the project.

## Architecture decision

**Modular monolith**, not microfrontends, not microservices, not a separate NestJS backend.

Rationale: in a 24h hackathon, the team doesn't know the task in advance and may need to pivot
between candidate domains (HubMI / accessibility / smart city / funding) within the first hour.
A single Next.js app with isolated feature modules lets the team switch domains by switching which
`features/*` folder is active, while auth, DB, UI, layout, and deployment stay untouched.

Explicitly rejected:
- Microfrontends / module federation — too much setup/deployment overhead for 24h, not worth the
  shared-dependency and routing complexity.
- A separate NestJS backend — Next.js Route Handlers / Server Actions are fast enough and avoid
  running two deployable services.
- Firebase Auth — doesn't fit the Postgres/Prisma stack as cleanly as Auth.js.

## Stack

- **Frontend**: Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, React Hook Form, Zod
- **Backend**: Next.js Route Handlers / Server Actions (no separate backend service unless a task
  genuinely requires one, e.g. heavy async processing)
- **Database**: PostgreSQL via Prisma, hosted on Neon (fast provisioning, no Docker, branch-able
  environments, quick schema iteration)
- **Auth**: Auth.js + Google OAuth. If auth isn't part of the task's core evaluation, skip it
  entirely at first and use a hardcoded mock user (`{ id: 'demo-user', name: '...' }`); wire up
  Auth.js only once it's clearly needed.
- **Deployment**: Vercel (preview deployments per PR) + Neon

## Repo layout

```
hackyear2026/
├── src/
│   ├── app/                 # Next.js routes
│   ├── features/            # one folder per domain, isolated
│   │   ├── hubmi/
│   │   ├── accessibility/
│   │   ├── funding/
│   │   └── smart-city/
│   ├── components/ui/       # shared UI (shadcn-based)
│   └── lib/
│       ├── db/              # Prisma client
│       └── auth/            # Auth.js config
└── prisma/
```

Each `features/<name>/` is self-contained: `components/`, `actions/`, `queries/`, `types.ts`.
See `.claude/CODE_REVIEW.md` for the isolation rules this implies.

## Core data model (minimal, domain-agnostic)

Start with just enough to demo any of the candidate domains:

```
User → Project → Needs, Resources, Contributions, Impact
```

Add domain-specific tables only once the actual task is known (e.g. `Location` for smart city,
`AccessibilityFeature` for accessibility, `FundingRound` for funding). Seed 2-3 sample projects
with realistic needs/impact numbers so the app never demos empty.

## Team

- **Maksym** — technical lead / architecture, frontend, API, DB, deployment (builds the skeleton
  and core components)
- **Anastasiia** — UX/UI, works on top of shadcn/ui components
- **Alexandra** — product/domain (problem framing, user flow, impact, presentation) — relevant
  ReFi knowledge
- **Phantom** — technical/blockchain if the task needs it (quadratic funding, smart contracts,
  Web3); otherwise backend/technical support
- **Maks_Rizhikov** — UI developer: builds the React application UI, implements client-side
  logic, and presents the data/information received from the backend

## Target timeline

`10:00 task revealed → 10:20 architecture/domain decided → 10:30 everyone coding → 12:00 first
working flow`. The whole point of this skeleton is to make that timeline possible, and to make a
mid-morning pivot between domains cheap.
