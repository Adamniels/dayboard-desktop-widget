// Type-only contracts for the two pure rules lifted from the prototype's renderVals
// in later phases. They have declared signatures so the rest of the system can bind to
// them, but no behavior yet (and therefore no tests, so they cannot satisfy a
// requirement early). See docs/prototype-gap-analysis.md.
import type { Todo } from "@dayboard/shared";
import type { Occurrence } from "./occurrences";

/** An occurrence carrying the linked project, used by the surfacing rule. */
export interface LinkedOccurrence extends Occurrence {
  projectId: string | null;
}

/**
 * Phase 2 (FR-TODO-2): while `now` is inside an event linked to a project, return that
 * project's open todos to surface at the top of the display; otherwise an empty list.
 */
export function surfaceTodos(now: Date, occurrences: LinkedOccurrence[], todos: Todo[]): Todo[] {
  void now;
  void occurrences;
  void todos;
  throw new Error("surfaceTodos: not implemented until Phase 2 (FR-TODO-2).");
}

/**
 * Phase 1/2: derive the current and next occurrence for the now line and now/next card.
 */
export function nowNext(
  now: Date,
  occurrences: Occurrence[],
): { current: Occurrence | null; next: Occurrence | null } {
  void now;
  void occurrences;
  throw new Error("nowNext: not implemented until Phase 1.");
}
