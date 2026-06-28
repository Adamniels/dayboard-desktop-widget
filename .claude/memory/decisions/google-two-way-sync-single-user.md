---
name: google-two-way-sync-single-user
description: Two-way Google sync simplified by single-user last-write-wins; poll in v1; recurrence read-only
type: decision
---

Sync is two way: changes made in admin push to Google, and changes made in Google
(e.g. on the phone) pull back into the app. Because there is exactly one user,
concurrent edits to the same event are rare, so conflict resolution is **last write
wins by `updatedAt` timestamp** — no multi user conflict machinery. v1 **polls**
Google every 30–60s using an incremental **sync token**; Google push webhooks (which
need a public HTTPS endpoint, doable later via Tailscale Funnel) are deferred.
Recurring events from Google are synced **read only** in v1 (exceptions, "this and
following", and timezones make editing recurrences genuinely fiddly).

**Why:** Real two-way sync is hard mostly because of concurrent-edit conflicts. Single
user removes almost all of that, making last-write-wins safe and the whole feature
tractable now instead of someday.

**How to apply:** Keep the reconciliation logic in `packages/core` as pure functions
over (localState, remoteState, lastSyncToken). Do not let recurrence editing leak into
v1 scope. Related: [[app-is-source-of-truth]], [[unified-event-model]].
