import type { Metadata } from "next";
import InvisibleCampus from "@/components/campus/InvisibleCampus";

export const metadata: Metadata = {
  title: "The Invisible Campus · GridCheck",
  description:
    "A cinematic, illustrative reveal of a campus electrical grid — generated with Grok Imagine.",
};

export default function InvisibleCampusPage() {
  return <InvisibleCampus />;
}
