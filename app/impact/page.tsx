import type { Metadata } from "next";
import Link from "next/link";
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

        <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-border bg-ink text-white">
          <div
            className="px-5 py-6 sm:px-7 sm:py-7"
            style={{
              background:
                "radial-gradient(ellipse 90% 120% at 85% 20%, rgba(34,211,238,0.22), transparent 55%), linear-gradient(135deg, #0b1620 0%, #12201c 55%, #0a1418 100%)",
            }}
          >
            <p className="font-mono text-mono-label font-semibold uppercase tracking-[0.14em] text-cyan-200/80 md:text-mono-label-desktop">
              SpaceXAI · Grok Imagine
            </p>
            <h2 className="mt-2 text-h2 font-extrabold tracking-tight text-white md:text-h2-desktop">
              The Invisible Campus
            </h2>
            <p className="mt-2 max-w-xl text-body text-white/70 md:text-body-desktop">
              A cinematic reveal of the grid beneath a fictional campus — and
              how smarter scheduling lights it up as one system.
            </p>
            <Link
              href="/impact/campus"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-cyan-300 px-5 text-btn font-bold text-[#041018] hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Reveal the Invisible Campus
            </Link>
          </div>
        </div>

        <ImpactDashboard />
      </div>
    </div>
  );
}
