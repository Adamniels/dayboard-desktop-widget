---
name: mac-mini-is-the-brain
description: Mac Mini hosts everything; display + admin are thin frontends talking only to the api
type: decision
---

The Mac Mini runs the entire system: the api, the PostgreSQL database, the Google
sync engine, and the reminder scheduler. It serves two frontends. `apps/display` is
the always on kiosk on the 15.6 inch screen — read only, never interacted with.
`apps/admin` is the control surface Adam opens from his main computer (desktop only in
v1) over Tailscale. The display and admin never talk to each other; both talk only to
the api. The admin is "how Adam interacts with the program", not a second brain.

**Why:** Adam wants the Mini to be the complete, self contained program so it keeps
working regardless of which client is connected. A single backend with two dumb
clients is the simplest design that delivers live updates and a clean split between
"show" and "control".

**How to apply:** Never put business logic in the display or admin that the api does
not also own. Realtime flows api → display via WebSocket. Remote access is solved by
Tailscale, not by exposing ports publicly. Related: [[stack-typescript-monorepo]],
[[app-is-source-of-truth]].
