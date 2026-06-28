---
name: devices-and-topology
description: Mac Mini server, always-on 15.6" kiosk screen (both orientations), main computer over Tailscale
type: context
---

Physical setup:
- **Mac Mini** — always on, runs the whole stack (api, Postgres, sync engine,
  scheduler) and serves the two frontends.
- **15.6 inch external screen** — attached to the Mini, **always on**, runs the
  display in a fullscreen browser kiosk (Chrome/Chromium). Must support **both
  portrait and landscape**; layouts are orientation aware.
- **Main computer** — Adam's daily machine; opens the admin web app over **Tailscale**.
  Phone admin is out of scope for v1 (desktop only).

No public ports are exposed; Tailscale is the access layer. Because the screen is
always on, the app does not need macOS power hooks in v1 (dimming/day-night can come
later as a display-side concern).

Related: [[mac-mini-is-the-brain]].
