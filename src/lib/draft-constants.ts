import type { BriefingActionType } from "./types";

export const DRAFT_ACTION_LABELS: Partial<Record<BriefingActionType, string>> =
  {
    cancel: "Generating cancellation notice...",
    renew: "Generating renewal strategy...",
    flag: "Generating risk summary...",
  };

export const DRAFT_DIALOG_TITLES: Partial<Record<BriefingActionType, string>> =
  {
    cancel: "Cancellation Notice Draft",
    renew: "Renewal Strategy Brief",
    flag: "Risk Summary for Legal Review",
  };
