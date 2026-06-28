---
name: postgresql-over-sqlite
description: Use PostgreSQL (not SQLite) as the database, per Adam
type: decision
---

The database is PostgreSQL, accessed via Drizzle. (SQLite was considered for its
zero-setup single-file simplicity, but Adam chose Postgres.)

**Why:** Adam's explicit call — he wants the more capable, production-grade engine and
room to grow (concurrent jobs like the sync engine + scheduler, richer queries, and
familiarity carried across his projects) rather than optimizing only for first-day
setup ease.

**How to apply:** Run Postgres locally on the Mini (Docker or native). Note the
sandbox here has no Postgres, so DB-backed integration tests run on Adam's machine via
`pnpm check`; keep core logic pure so most tests need no DB. Related:
[[stack-typescript-monorepo]], [[core-stays-pure]].
