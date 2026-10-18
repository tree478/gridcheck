/** Scene ids for POST /api/campus/visualize — keep in sync with backend. */
export type CampusSceneId = "seen" | "revealed" | "thinks";

export type CampusScheduleContext = {
  activityLabel: string;
  /** ISO start of the recommended window */
  recommendedStart: string;
  /** ISO end of the recommended window */
  recommendedEnd: string;
  /** Modeled CO₂ saved vs. Soonest (grams). */
  savedGrams: number;
};

export type CampusVisualizeResponse = {
  scene: CampusSceneId;
  /** Absolute or relative image URL. Null while using frontend placeholders. */
  imageUrl: string | null;
  title: string;
  description: string;
  generatedBy: "Grok Imagine";
  isIllustrative: true;
  scheduleContext: CampusScheduleContext | null;
};

export type CampusVisualizeRequest = {
  scene: CampusSceneId;
};
