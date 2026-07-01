# Prototype gap analysis

The approved interactive prototype lives at
`Dayboard Interactive Prototype/Dayboard.dc.html` (logic in its `renderVals` and the
methods below it; `support.js` is the prototype runtime). It is the canonical reference
for **how Dayboard should look and behave** — see
`.claude/memory/context/design-reference-prototype.md`. This document records how close
that prototype is to the real product, what is real versus mocked, and which phase turns
each mocked part into the real thing.

## Verdict

The prototype fully derisks the design and the frontend, and it quietly validates the
architecture. It implements almost none of the hard backend, which is expected. The work
to reach the real product is concentrated where the roadmap already puts it: Google sync,
the data and time model, the reminder scheduler, and splitting one in browser app into a
real api plus two clients. Roughly 80 to 90 percent of the **frontend** is represented
and portable; the **backend** is roughly 0 percent. Nothing in the prototype contradicts
the spec, so the path is clean, just front loaded with the parts the mockup made look
easy.

## Fidelity map

| Area | In the prototype | Keep as design truth? | Real work still needed |
| --- | --- | --- | --- |
| Layout, styling, both orientations | Done, polished | Yes | Rebuild as React + Vite components (transcription) |
| Meeting vs block styling | Done | Yes | None beyond the rebuild |
| Day / week / month views | Done | Yes | Bind to real occurrences; multi week navigation |
| Now line, scroll to now, now/next card | Done (pure logic) | Yes | Lift the rule into `packages/core`, feed real time |
| Surfaced project todos in a linked block | Done (real rule) | Yes | Lift into `packages/core`, feed real data |
| Pomodoro ring countdown | Real, runs in page | Yes (visual) | Back with the real scheduler |
| Reminder takeover overlay | Real overlay, manual trigger | Yes (visual) | Fire from the scheduler on the real clock |
| Event create / edit / delete, todos, notes, reminders | Real against in memory state | Yes (UX) | Persist via api + Postgres |
| Google connect + sync status | Boolean toggle + label | No (faked) | Build the whole two way sync engine |
| Display and admin together | One in browser instance, shared state | No (faked) | Two separate clients over REST + WebSocket |
| Event time model | Weekday index + hour ints, this week only | **No — do not carry over** | Absolute datetimes + timezone + recurrence |
| Recurrence | A label string only | No | Real expansion into occurrences |
| Persistence | None; refresh resets | No | Postgres is the source of truth |

## What is real vs mocked, in one line each

Real (in browser only): the entire UI, view and orientation switching, event/todo/note/
reminder CRUD against memory, the now/next and surfaced todos rules, the Pomodoro
countdown, and the takeover overlay.

Mocked or absent: any backend at all, Postgres persistence, Google two way sync (a
toggle), realtime/WebSocket (the two screens share one in browser state), the reminder
scheduler (the takeover is a button, nothing fires on a schedule), recurrence expansion,
and real datetimes (the clock is pinned and events use weekday indices).

## The data model decision this surfaced

The prototype's time shape (`day` 0 to 6 plus `sh/sm/eh/em`, pinned to the current week)
is a mockup convenience and **must not** become the schema. The real model is absolute
start and end timestamps with an explicit timezone, plus a recurrence rule expanded to
occurrences. This is now settled in
`.claude/memory/decisions/datetime-recurrence-model.md` and must be in place before
Phase 1, because Google sync, the scheduler, multi week navigation, and conflict
resolution all depend on it.

## Prototype to phase mapping

Each phase realizes a slice of the prototype. When building it, open the prototype, match
its look and interactions, and treat its `renderVals` object as the contract for what the
api must feed the screen.

- **Phase 0 — Foundations.** No prototype UI yet. Stand up the monorepo, Postgres, and
  the empty api + WebSocket, and define the real event schema
  (`datetime-recurrence-model`). This is where you reject the prototype's time shape and
  set the real one.

- **Phase 1 — Google integration spine.** Realizes the prototype's calendar: week view
  with meeting vs block styling, the now line, day/week/month, and both orientations
  (FR-VIEW, FR-EVT, FR-RT). Replaces the prototype's fakes for real: the Google toggle
  becomes the actual two way sync engine (FR-CAL), the shared in browser state becomes
  REST reads plus live WebSocket push between the separate display and admin clients, and
  weekday indices become real occurrences. The prototype's event editor is the admin UX
  to match.

- **Phase 2 — Planning layer.** Realizes the prototype's projects panel, the surfaced
  todos behavior, the reminders admin, the Pomodoro, the takeover overlay, and notes
  (FR-PROJ, FR-TODO, FR-REM, FR-NOTE). The big real addition the prototype hides: a
  reminder/timer **scheduler** on the Mini that fires on the real clock, instead of the
  manual trigger button. Lift the surfaced todos and now/next rules from the prototype
  into `packages/core` here.

- **Phase 3 — More views and polish.** Done. The prototype's day and month views and admin
  driven view switching (FR-VIEW-3) are now real over live data: pure `buildDay`/`buildMonth`
  bucketing in `apps/display`, a `display_setting` singleton the admin patches (`GET`/`PATCH
  /display`), and a live `display.changed` push. The visual polish pass moved the display onto
  shared theme tokens and rebuilt the admin as the prototype's dark Control Room (sidebar +
  Calendar/Projects/Reminders/Notes/Display tabs). Day/night dimming was explicitly deferred to
  a later phase (see `docs/phases/phase-3-plan.md`).

- **Phase 3.1 — Interactive admin calendar.** Beyond the prototype (which authored events from
  a list plus a form): the admin Calendar tab becomes a Google-Calendar-style weekly grid on
  FullCalendar, with drag to create, click to edit, and drag to move/resize (FR-EVT-3). See
  `docs/phases/phase-3.1-admin-calendar-plan.md`.

- **Phase 4 — AI inside the product.** Not in the prototype at all; future work.

## What transfers vs what gets rebuilt

Transfers: every visual component, the layout, both orientations, the type styling, the
takeover, the Pomodoro ring, and crucially the two pure rules (now/next, surfaced todos),
which move into `packages/core` and just get fed real data. The `renderVals` object is
effectively a written contract for the api's read model — use it that way.

Rebuilt: the prototype runs on a prototype runtime (`support.js` plus `x-dc` templates),
so the real app reimplements these as React + Vite components. That is transcription, not
redesign. And anything time or sync related is built fresh against the real model.
