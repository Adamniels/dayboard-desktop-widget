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
 * FR-TODO-2: while `now` is inside any event linked to a project, return that project's
 * open todos to surface at the top of the display; otherwise an empty list. Open means a
 * status other than "done". Ordered by dueAt (soonest first, undated last), then creation.
 * Pure: `now` and the data are passed in.
 */
export function surfaceTodos(now: Date, occurrences: LinkedOccurrence[], todos: Todo[]): Todo[] {
  const t = now.getTime();

  const activeProjectIds = new Set<string>();
  for (const o of occurrences) {
    if (o.projectId && o.start.getTime() <= t && t < o.end.getTime()) {
      activeProjectIds.add(o.projectId);
    }
  }
  if (activeProjectIds.size === 0) return [];

  return todos
    .filter((td) => td.projectId !== null && activeProjectIds.has(td.projectId) && td.status !== "done")
    .sort((a, b) => {
      const ad = a.dueAt ? a.dueAt.getTime() : Number.POSITIVE_INFINITY;
      const bd = b.dueAt ? b.dueAt.getTime() : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
}

/**
 * Derive the current and next occurrence for the now line and now/next card (lifted from
 * the prototype). `current` is the occurrence containing `now`; `next` is the soonest
 * occurrence that starts after `now`. Pure: `now` is passed in.
 */
export function nowNext(
  now: Date,
  occurrences: Occurrence[],
): { current: Occurrence | null; next: Occurrence | null } {
  const t = now.getTime();
  const sorted = [...occurrences].sort((a, b) => a.start.getTime() - b.start.getTime());

  let current: Occurrence | null = null;
  let next: Occurrence | null = null;
  for (const o of sorted) {
    if (o.start.getTime() <= t && t < o.end.getTime()) {
      current = o;
    } else if (o.start.getTime() > t && next === null) {
      next = o;
    }
  }
  return { current, next };
}
