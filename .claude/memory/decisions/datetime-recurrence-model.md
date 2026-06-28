---
name: datetime-recurrence-model
description: Events are absolute datetimes + timezone with a recurrence rule expanded to occurrences; the prototype's weekday-index shape is NOT the model
type: decision
---

The canonical event time model is **absolute start/end timestamps with an explicit IANA
timezone**, plus an optional **recurrence rule** (RFC 5545 RRULE-style) that
`packages/core` expands into concrete occurrences for a queried window. Recurrence
exceptions (a moved or cancelled occurrence) are stored as overrides. The interactive
prototype models time as a weekday index (0–6) plus hour/minute integers pinned to the
current week — that is a mockup convenience for display only and **must not** become the
real schema.

**Why:** Google sync, the reminder scheduler, multi-week navigation, and last-write-wins
conflict resolution all depend on real instants and timezones. Building on weekday indices
and retrofitting datetimes later would ripple through the schema, the api, the sync
engine, and the UI. Settle this before Phase 1.

**How to apply:** Define the event schema in `packages/shared` with start/end as
timestamps + tz and a recurrence field. Keep expansion pure in `packages/core`
(`expandOccurrences(rule, window, now)`). The UI derives its grid positions from real
occurrences, mirroring the prototype's `renderVals` shape. v1 syncs Google recurring
events read-only. Related: [[unified-event-model]], [[google-two-way-sync-single-user]],
[[core-stays-pure]], [[design-reference-prototype]].
