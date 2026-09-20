// Re-export all shared types from shared workspace
export * from "../../../shared/types/index.js";

export interface OfficerUIState {
  isAlarmMuted: boolean;
  selectedTripId: string | null;
  activeTab: "command" | "history";
}
