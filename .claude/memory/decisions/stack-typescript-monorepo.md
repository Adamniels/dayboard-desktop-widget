---
name: stack-typescript-monorepo
description: All TypeScript pnpm monorepo — Node api, React display + admin, Postgres/Drizzle
type: decision
---

The whole system is TypeScript in a pnpm workspace monorepo: `apps/api` (Node
backend), `apps/display` and `apps/admin` (React + Vite), `packages/core` (pure
domain logic), `packages/shared` (types + zod schemas). Database is PostgreSQL via
Drizzle ORM. Calendar grids use FullCalendar. The api pushes live updates to the
display over a WebSocket.

**Why:** One language across backend and both frontends means shared types and zod
schemas over the wire, one mental model, and far less context switching for both Adam
and the AI agent. C# or Python would each fight at least one leg (Google client,
realtime, or sharing types with React). FullCalendar gives day/week/month views for
free, which directly serves the "add views later" goal.

**How to apply:** New shared types go in `packages/shared`. Pure logic goes in
`packages/core` (see [[core-stays-pure]]). Anything touching the DB, network, or clock
lives in `apps/api`. Related: [[postgresql-over-sqlite]], [[mac-mini-is-the-brain]].
