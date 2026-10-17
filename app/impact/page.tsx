import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impact · GridWait" };

export default function ImpactPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Impact</h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        Your sustainability score, modeled CO₂ saved, and list of planned runs will appear here.
      </p>
    </div>
  );
}
