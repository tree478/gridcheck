import type { CampusContinuity, CampusScene } from "./types";
import { CAMPUS_SCENES } from "./types";

const SHARED_CAMPUS =
  "A fictional historic New England university campus: one quadrangle surrounded by red-brick academic buildings, dormitories, a library, laboratories, and enclosed courtyards. Aerial photograph from a high three-quarter viewpoint looking down across that quadrangle, the same buildings and the same camera position in every scene. Blue-hour night, photorealistic cinematic 35mm frame, film-grade lighting. The photograph contains no writing, logos, or watermarks.";

const GENERATE: Record<CampusScene, string> = {
  normal: `${SHARED_CAMPUS} Warm light glows in many windows. Stone walkways and trees sit in the courtyards. The campus looks quiet and inhabited.`,
  revealed: `${SHARED_CAMPUS} The brick buildings are subtly translucent. Intricate glowing cyan and amber electrical pathways run beneath the walkways and between the buildings, energy moving through the campus like a living nervous system. Dark navy atmosphere, premium science-fiction visual effects, still the same quadrangle and the same aerial camera.`,
  optimized: `${SHARED_CAMPUS} Elegant glowing cyan pathways connect the dormitories, academic buildings, and shared facilities in a coordinated network. The illumination is calm and harmonious, and the campus looks intelligently connected. Dark navy night, premium cinematic lighting, still the same quadrangle and the same aerial camera.`,
};

const EDIT: Record<Exclude<CampusScene, "normal">, string> = {
  revealed:
    "Keep the same campus, the same buildings, the same aerial angle, and the same crop. Make the brick buildings subtly translucent and add intricate glowing cyan and amber electrical pathways beneath the walkways and between the buildings, energy flowing like a living nervous system. Dark navy atmosphere with premium science-fiction lighting. The photograph contains no writing, logos, or watermarks.",
  optimized:
    "Keep the same campus, the same buildings, the same aerial angle, and the same crop. Change the electrical network so elegant cyan pathways connect the dormitories, academic buildings, and shared facilities in a coordinated, harmonious pattern. Sophisticated illumination, the campus looking connected. The photograph contains no writing, logos, or watermarks.",
};

export const SCENE_COPY: Record<CampusScene, { title: string; description: string }> = {
  normal: {
    title: "The Campus We See",
    description:
      "An artistic aerial illustration of a fictional New England university campus at night.",
  },
  revealed: {
    title: "The Campus We Don't See",
    description:
      "An artistic visualization of that fictional campus as an electrical network. Not a map of real infrastructure.",
  },
  optimized: {
    title: "The Campus That Thinks",
    description:
      "An artistic illustration of a more coordinated network on the same fictional campus. A future vision of GridCheck, not a campus-wide optimization.",
  },
};

export function isCampusScene(value: unknown): value is CampusScene {
  return typeof value === "string" && (CAMPUS_SCENES as readonly string[]).includes(value);
}

export function promptFor(scene: CampusScene, continuity: CampusContinuity): string {
  if (continuity === "edited-from-normal" && scene !== "normal") return EDIT[scene];
  return GENERATE[scene];
}
