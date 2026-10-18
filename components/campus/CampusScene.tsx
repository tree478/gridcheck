import { formatMass } from "@/components/impact/impactModel";
import { formatWindow } from "@/components/option-cards/optionCardModel";
import CampusPlaceholder from "./CampusPlaceholder";
import { CAMPUS_CLOSING_LINE, sceneCopy } from "./campusScenes";
import type { CampusVisualizeResponse } from "./campusTypes";

type Props = {
  data: CampusVisualizeResponse;
  /** Remount key so Ken Burns + fade restart on scene change */
  animKey: string;
};

export default function CampusScene({ data, animKey }: Props) {
  const copy = sceneCopy(data.scene);
  const isLast = data.scene === "thinks";

  return (
    <div className="absolute inset-0 overflow-hidden" key={animKey}>
      <div className="campus-kenburns absolute inset-0">
        {data.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Grok URLs; not in next/image remotePatterns yet
          <img
            src={data.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <CampusPlaceholder scene={data.scene} />
        )}
      </div>

      {/* Cinematic vignette + readability gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/55" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.45)_100%)]" />

      <div className="absolute inset-x-0 top-0 z-10 px-4 pt-6 sm:px-8 sm:pt-10">
        <p className="campus-fade-up font-mono text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cyan-200/70 sm:text-[0.6875rem]">
          The Invisible Campus
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-28 z-10 px-4 sm:bottom-32 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="campus-fade-up text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {copy.title}
          </h1>
          <p className="campus-fade-up-delay mt-3 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            {copy.subtitle}
          </p>

          {data.scheduleContext ? (
            <div className="campus-fade-up-delay-2 mt-6 max-w-md rounded-2xl border border-cyan-300/25 bg-black/45 px-4 py-4 backdrop-blur-md sm:px-5">
              <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cyan-200/80">
                GridCheck recommendation
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {data.scheduleContext.activityLabel}
              </p>
              <p className="mt-1 text-sm text-white/75">
                {formatWindow(
                  data.scheduleContext.recommendedStart,
                  data.scheduleContext.recommendedEnd,
                )}
              </p>
              <p className="mt-2 text-sm text-cyan-100">
                About {formatMass(data.scheduleContext.savedGrams)} CO₂ saved
                vs. soonest{" "}
                <span className="text-white/45">(modeled estimate)</span>
              </p>
            </div>
          ) : null}

          {isLast ? (
            <p className="campus-fade-up-delay-2 mt-8 max-w-lg text-base font-medium tracking-wide text-cyan-100/90 sm:text-lg">
              {CAMPUS_CLOSING_LINE}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
