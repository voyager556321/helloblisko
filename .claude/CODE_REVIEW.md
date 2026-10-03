# Code review rules — feature isolation

These rules exist to protect the modular-monolith layout described in `CLAUDE.md`: one Next.js
app, multiple isolated `features/*` modules, so the team can drop or swap a domain without
touching the rest of the app.

## Rules

1. **No cross-feature imports.** Code in `src/features/<a>/**` must never import from
   `src/features/<b>/**`. If two features need the same logic, move it to `src/components/ui`,
   `src/lib`, or a shared types module — not into one of the features.
2. **Features only import "inward" from shared layers.** A feature may import from
   `src/components/ui`, `src/lib/db`, `src/lib/auth`, and shared types — never the other way
   around. Shared layers must not import anything from `src/features/**`.
3. **A feature is self-contained.** Each `features/<name>/` keeps its own `components/`,
   `actions/`, `queries/`, and `types.ts`. Don't reach into another feature's internals to avoid
   duplicating a query or action — duplication here is cheaper than coupling.
4. **Route handlers/pages stay thin.** `src/app/**` routes should call into a feature's
   `actions/`/`queries/`, not contain feature business logic directly — this keeps a feature
   removable by deleting its folder and its routes.
5. **No speculative schema or abstractions.** Don't add domain tables, feature folders, or shared
   abstractions for a domain that hasn't been confirmed as the actual hackathon task yet. Extend
   the minimal core model (`User`, `Project`, `Need`, `Resource`, `Contribution`, `Impact`) instead
   of guessing ahead.
6. **Auth stays optional until needed.** Don't block feature work on wiring real Auth.js if a
   mock user (`lib/auth/mock-user.ts`-style) is enough for the current demo.

## What a review should flag

- An import statement reaching from one `features/*` folder into another.
- Business logic (DB queries, validation, domain rules) living directly in `src/app/**` instead of
  in a feature's `actions/`/`queries/`.
- New Prisma models/fields added for a domain that isn't the confirmed task.
- Shared code (`components/ui`, `lib/**`) importing something from `features/**`.