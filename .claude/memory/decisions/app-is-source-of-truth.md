---
name: app-is-source-of-truth
description: Local DB is the source of truth; Google Calendar is a mirror, not the master
type: decision
---

The app's PostgreSQL database is always the source of truth. Google Calendar is a
synced mirror so plans survive away from the desk. The long term goal is to rely on
Google less over time while it stays a faithful backup. Extra entities Google cannot
represent (projects, to dos, reminders, notes) live only in the app, keyed to events
by `googleEventId` where relevant.

**Why:** Adam wants a standalone product he could eventually run without Google, but
also wants the basics to appear in Google so his plans are on his phone when away.
Making the local DB authoritative is what allows both.

**How to apply:** Never treat a Google response as overwriting local intent blindly —
reconcile through the sync engine. Google specific fields are nullable mirrors, not
required. Related: [[google-two-way-sync-single-user]], [[unified-event-model]].
