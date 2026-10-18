import type { Metadata } from "next";
import CampusStory from "@/components/campus/CampusStory";
import { formatWindow } from "@/components/option-cards/optionCardModel";
import { ACTIVITY_CATALOG } from "@/lib/constants";
import { mockScheduleResult } from "@/lib/mocks/schedule";

export const metadata: Metadata = {
  title: "The Invisible Campus — GridCheck",
  description:
    "Three artistic scenes of a fictional campus, generated once and shown from the local cache.",
};

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

export default function CampusPage() {
  return <CampusStory recommendation={demoRecommendation()} />;
}
