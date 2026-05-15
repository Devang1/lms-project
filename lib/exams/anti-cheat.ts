export type SuspicionEvent =
  | "TAB_SWITCH"
  | "APP_SWITCH"
  | "FULLSCREEN_EXIT"
  | "WINDOW_MINIMIZE"
  | "SPLIT_SCREEN_SUSPECTED"
  | "PASTE_ATTEMPT"
  | "COPY_ATTEMPT"
  | "CONTEXT_MENU"
  | "TEXT_SELECTION"
  | "LONG_PRESS"
  | "RAPID_ANSWERING";

export const suspicionWeights: Record<SuspicionEvent, number> = {
  TAB_SWITCH: 10,
  APP_SWITCH: 10,
  FULLSCREEN_EXIT: 15,
  WINDOW_MINIMIZE: 10,
  SPLIT_SCREEN_SUSPECTED: 12,
  PASTE_ATTEMPT: 8,
  COPY_ATTEMPT: 8,
  CONTEXT_MENU: 5,
  TEXT_SELECTION: 6,
  LONG_PRESS: 5,
  RAPID_ANSWERING: 15
};

export const eventLabels: Record<string, string> = {
  TAB_SWITCH: "Switched tab or app",
  APP_SWITCH: "App moved to background",
  FULLSCREEN_EXIT: "Exited fullscreen",
  WINDOW_MINIMIZE: "Screen minimized or hidden",
  SPLIT_SCREEN_SUSPECTED: "Split-screen suspected",
  PASTE_ATTEMPT: "Tried to paste",
  COPY_ATTEMPT: "Tried to copy",
  CONTEXT_MENU: "Opened context menu",
  TEXT_SELECTION: "Tried to select text",
  LONG_PRESS: "Long-press copy attempt",
  RAPID_ANSWERING: "Answered unusually fast"
};

export function getSuspicionScore(events: Array<{ event: string }>) {
  const minimizeCount = events.filter((item) => item.event === "WINDOW_MINIMIZE").length;
  const baseScore = events.reduce((score, item) => {
    const event = item.event as SuspicionEvent;
    return score + (suspicionWeights[event] ?? 4);
  }, 0);

  return baseScore + (minimizeCount >= 3 ? 20 : 0);
}

export function getRiskLevel(score: number) {
  if (score >= 45) return "High Risk";
  if (score >= 20) return "Medium Risk";
  return "Low Risk";
}

export function getRiskClass(score: number) {
  if (score >= 45) return "border-destructive/40 bg-destructive/10 text-destructive";
  if (score >= 20) return "border-accent/50 bg-accent/15 text-accent-foreground";
  return "border-secondary/35 bg-secondary/10 text-secondary";
}
