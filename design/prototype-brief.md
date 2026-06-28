# Prototype design prompt — Dayboard

Paste the block below into Claude (or any AI that builds UI prototypes). It produces an
interactive, mock-data prototype that shows every feature with a high-end design. It is
deliberately not wired to a real backend or Google — the goal is to feel the product and
see all functionality.

---

You are a senior product designer and front-end engineer. Build a **high-fidelity,
interactive prototype** of a product called **Dayboard**. It must look genuinely
beautiful (Linear / Things / Fantastical level of polish) and demonstrate every feature
listed below. It does **not** need to really work: use hardcoded in-memory mock data, no
network calls, no real Google API, no real persistence. Prioritize visual quality and
completeness of the demoed functionality over real logic.

**Tech:** a single self-contained React file using Tailwind utility classes and
`useState` for all state. No external data fetching; all sample data is hardcoded. Smooth
transitions and micro-animations. Responsive.

## What Dayboard is

A self-hosted calendar and planning display. A Mac Mini runs everything and drives an
always-on 15.6" screen showing a read-only **Display** (a kiosk you never touch). You
control it from an **Admin** app on your main computer. The app is the source of truth and
syncs two ways with Google Calendar so plans follow you to your phone.

Build **two surfaces in one prototype** with a top-level toggle to switch between
**Display** and **Admin**.

## Surface 1 — Display (the always-on kiosk; read-only, glanceable from across a room)

- A **landscape / portrait toggle** so I can preview both orientations; the layout adapts.
- **Header:** large live clock and date, and a subtle "Synced with Google · just now" pill.
- **Main calendar:** a weekly time-grid (day columns, hour rows) with a current-time
  indicator line. Events are styled by **type**: regular **meetings** vs **time blocks**
  (blocks look distinct — softer, hatched or tinted — to read as reserved focus time).
- **View switcher:** day / week / month (week is the default; show that day and month
  views exist too).
- **Side panel** (in landscape; stacks in portrait):
  - **Now / Next** card: what's happening now and how long is left, then what's next.
  - **Surfaced to-dos:** when the current time is inside a time block linked to a project,
    show that project's open to-dos as a checklist at the top. Outside a block, hide it.
  - **Active timer:** a Pomodoro-style countdown ring.
  - **Notes** snippet.
- **Reminder takeover:** a button to trigger a demo of a reminder firing — a large overlay
  takes over the screen (event title, time, a chime icon), then dismisses back to normal.
- **Aesthetic:** dark, calm, high-contrast, ambient, with large readable type and big
  display numerals. It should look great on a wall, readable at a glance.

## Surface 2 — Admin (where I actually input; clean, denser, desktop)

- **Event editor:** create / edit / delete events; set **type** (meeting or block), start
  and end time, optional **recurrence**, and an optional **link to a project**. Include a
  small calendar to click into.
- **Projects panel:** list projects; each expands to its **to-dos** with add and
  check-off. Show that linking a block to a project is what makes those to-dos surface on
  the Display.
- **Reminders & timers:** create a reminder at an **absolute** time or a **relative** one
  ("in 25 min"), with optional **recurrence**; and start a **Pomodoro**.
- **Notes:** create a note, general or attached to a project.
- **Display control:** pick which view (day / week / month) the Display currently shows.
- **Google sync:** a status area with a (mock) "Connect Google" button and last-sync time.
- **Aesthetic:** modern, efficient, rounded cards, clear hierarchy — the control room to
  the Display's showroom.

## Design direction

Deep charcoal / near-black base, one confident accent color, soft elevated surfaces,
generous spacing, rounded corners, subtle shadows, tasteful motion. A clean geometric
sans (e.g. Inter). You have creative latitude, but hold a high bar — this should look like
a shipped premium product, not a wireframe.

## Interactions to make clickable

Switch Display ↔ Admin; switch calendar views; toggle Display orientation; click an event
to see its detail; check off a surfaced to-do; start the Pomodoro and watch the ring count
down; trigger the reminder takeover and dismiss it.

## Sample data (make it feel like a real day)

A morning standup (meeting), a 2-hour "Deep work" **block** linked to a **"Dayboard"
project** that has 3 open to-dos, lunch, an afternoon meeting, an evening reminder "Take
out the trash" at 20:00, and one Pomodoro mid-afternoon. A couple of projects with
to-dos, and a note or two.

Deliver it as one runnable file.
