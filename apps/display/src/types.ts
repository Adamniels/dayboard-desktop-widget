// Shapes the display consumes from the api. Mirrors the api occurrence read model
// (the prototype's renderVals contract, with real datetimes).
export interface OccurrenceDTO {
  eventId: string;
  title: string;
  type: "meeting" | "block" | "general";
  projectId: string | null;
  start: string;
  end: string;
  isOverride: boolean;
  recurring: boolean;
  googleEventId: string | null;
}

export interface DisplayConfig {
  timezone: string;
  startHour: number;
  endHour: number;
}
