import type { CampusSceneId } from "./campusTypes";

export type CampusSceneCopy = {
  id: CampusSceneId;
  /** Short title shown as the main overlay heading */
  title: string;
  subtitle: string;
  /** Backend-facing description (also used in mock responses) */
  description: string;
};

export const CAMPUS_SCENES: readonly CampusSceneCopy[] = [
  {
    id: "seen",
    title: "The Campus We See",
    subtitle: "Every light tells a story. Every building draws power.",
    description:
      "An artistic aerial view of a fictional Ivy League-style campus at night.",
  },
  {
    id: "revealed",
    title: "The Campus We Don't See",
    subtitle: "Beneath the surface, an invisible network connects us all.",
    description:
      "An artistic visualization of the campus electrical network.",
  },
  {
    id: "thinks",
    title: "The Campus That Thinks",
    subtitle:
      "What if every decision worked with the grid, instead of against it?",
    description:
      "An artistic visualization of coordinated, grid-aware campus energy use.",
  },
] as const;

export const CAMPUS_CLOSING_LINE =
  "One campus. Thousands of decisions. One invisible grid.";

export const CAMPUS_SCENE_IDS: readonly CampusSceneId[] = CAMPUS_SCENES.map(
  (s) => s.id,
);

export function sceneCopy(id: CampusSceneId): CampusSceneCopy {
  const found = CAMPUS_SCENES.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown campus scene: ${id}`);
  return found;
}

export function sceneIndex(id: CampusSceneId): number {
  return CAMPUS_SCENE_IDS.indexOf(id);
}
