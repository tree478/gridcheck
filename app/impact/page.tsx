import type { Metadata } from "next";
import ImpactDashboard from "@/components/impact/ImpactDashboard";

export const metadata: Metadata = { title: "Impact · GridCheck" };

export default function ImpactPage() {
  return (
    <div className="flex-1 bg-bg">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
        <h1 className="text-h1 font-extrabold tracking-tight text-ink md:text-h1-desktop">
          Your impact
        </h1>
        <p className="mt-3 max-w-2xl text-body text-secondary md:text-body-desktop">
          Every number here is a modeled estimate, compared with the soonest
          time you were free.
        </p>
        <ImpactDashboard />
      </div>
    </div>
  );
}
