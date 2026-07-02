# Definition of done — traceability matrix

Every requirement, the story it serves, how it is verified, and its type. The **Status**
column here is a static snapshot kept at `Todo`; the live truth is the generated
`docs/STATUS.md`. Keep this table in sync when you add or change requirements (the
`spec-syncer` agent does this).

A feature is "done" when: its requirement exists here, its story has Given/When/Then,
its `auto*` rows read PASS in `STATUS.md`, and any manual/review rows have been checked
off by Adam.

| Req ID | Story | How to verify | Type | Status |
| --- | --- | --- | --- | --- |
| FR-CAL-1 | US-CAL1 | OAuth exchange persists tokens; manual consent check | Auto + Manual | Todo |
| FR-CAL-2 | US-CAL1 | First sync imports all events | Auto | Todo |
| FR-CAL-3 | US-CAL2 | Incremental sync applies remote changes via token | Auto | Todo |
| FR-CAL-4 | US-CAL2 | Local change produces correct Google push payload | Auto | Todo |
| FR-CAL-5 | US-CAL2 | Conflict resolves last-write-wins by updatedAt | Auto | Todo |
| FR-CAL-6 | US-CAL3 | Recurrence expands to occurrences; edits rejected | Auto + Manual | Todo |
| FR-EVT-1 | US-EVT1 | Event CRUD endpoints, single-user scoped | Auto | Todo |
| FR-EVT-2 | US-EVT1 | Event type validated (meeting \| block \| general) | Auto | Todo |
| FR-EVT-3 | US-EVT2 | Interactive admin week calendar: drag-create/move/resize | Auto + Review | Todo |
| FR-EVT-4 | US-EVT1 | Deleting an event asks for confirmation first | Auto + Review | Todo |
| FR-VIEW-1 | US-VIEW1 | Weekly view groups events correctly | Auto + Review | Todo |
| FR-VIEW-2 | US-VIEW1 | Portrait and landscape verified on device | Manual | Todo |
| FR-RT-1 | US-VIEW1 | Data change emits WebSocket message | Auto | Todo |
| FR-PROJ-1 | US-TODO1 | Project CRUD endpoints | Auto | Todo |
| FR-PROJ-2 | US-TODO1 | Deleting a project confirms; states to-dos go with it | Auto + Review | Todo |
| FR-TODO-1 | US-TODO1 | Todo CRUD with status under a project | Auto | Todo |
| FR-TODO-2 | US-TODO1 | Todos surface only inside a linked block | Auto | Todo |
| FR-TODO-3 | US-TODO1 | Deleting a to-do asks for confirmation first | Auto + Review | Todo |
| FR-REM-1 | US-REM1 | Absolute reminder fires at the right instant | Auto | Todo |
| FR-REM-2 | US-REM1 | Relative timer computes fire time from now | Auto | Todo |
| FR-REM-3 | US-REM1 | Recurring reminder computes next occurrence | Auto | Todo |
| FR-REM-4 | US-REM1 | Fire produces display takeover payload | Auto + Review | Todo |
| FR-NOTE-1 | US-NOTE1 | Note CRUD, general or project-linked | Auto | Todo |
| FR-NOTE-2 | US-NOTE1 | Deleting a note asks for confirmation first | Auto + Review | Todo |
| FR-NOTE-3 | US-NOTE1 | Notes render as basic markdown (breaks, bold, lists, safe links) | Auto | Todo |
| FR-NOTE-4 | US-NOTE1 | Editing an existing note's text persists | Auto + Review | Todo |
| FR-VIEW-3 | US-VIEW2 | Day/month buckets; active view switch | Auto + Review | Todo |
| NFR-REL-1 | US-NFR1 | Works against local DB when Google is down | Auto | Todo |
| NFR-SEC-1 | US-NFR1 | Admin bound to Tailscale; no public port; no login (v1) | Review | Todo |
| NFR-PERF-1 | US-NFR1 | Admin change appears on display in ~1s | Manual | Todo |
| NFR-MAINT-1 | US-NFR1 | core purity guard (no clock/IO/DB imports) | Auto | Todo |
