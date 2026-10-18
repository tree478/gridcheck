import type { Metadata } from "next";
import { connection } from "next/server";
import CampusStory from "@/components/campus/CampusStory";
import { formatWindow } from "@/components/option-cards/optionCardModel";
import { campusSceneStatus } from "@/lib/campus/visualize";
import { ACTIVITY_CATALOG } from "@/lib/constants";
import { mockScheduleResult } from "@/lib/mocks/schedule";

export const metadata: Metadata = {
  title: "The Invisible Campus — GridCheck",
  description:
    "Three artistic scenes of a fictional campus, generated once and shown from the local cache.",
};

/** The saved scenes are read from this machine on each request. */
export const instant = false;

function demoRecommendation() {
  const result = mockScheduleResult.results.find((item) => item.ok && item.activityId === "washer");
  if (!result?.ok) return null;
  const option = result.options.find((item) => item.labels.includes("recommended"));
  if (!option) return null;
  const name = ACTIVITY_CATALOG.find((activity) => activity.id === "washer")?.name ?? "Washer";
  return {
    name,
    windowLabel: formatWindow(option.start, option.end),
    savedGrams: option.savedVsSoonestGrams,
  };
}

export default async function CampusPage() {
  await connection();
  const status = campusSceneStatus();
  return (
    <CampusStory
      recommendation={demoRecommendation()}
      initialImages={{
        normal: status.scenes.normal.imageUrl,
        revealed: status.scenes.revealed.imageUrl,
        optimized: status.scenes.optimized.imageUrl,
      }}
    />
  );
}
