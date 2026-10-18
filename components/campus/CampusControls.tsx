import type { CampusSceneId } from "./campusTypes";
import { CAMPUS_SCENE_IDS, sceneIndex } from "./campusScenes";

type Props = {
  scene: CampusSceneId;
  onNext: () => void;
  onExit: () => void;
  isLast: boolean;
};

export default function CampusControls({
  scene,
  onNext,
  onExit,
  isLast,
}: Props) {
  const index = sceneIndex(scene);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-5 pt-16 sm:px-8 sm:pb-8">
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex items-center justify-center gap-2 sm:justify-start"
          role="tablist"
          aria-label="Scene progress"
        >
          {CAMPUS_SCENE_IDS.map((id, i) => (
            <span
              key={id}
              role="tab"
              aria-selected={i === index}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index
                  ? "w-8 bg-cyan-300"
                  : i < index
                    ? "w-4 bg-white/50"
                    : "w-4 bg-white/20"
              }`}
            />
          ))}
          <span className="ml-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-white/45">
            {index + 1} / {CAMPUS_SCENE_IDS.length}
          </span>
        </div>

        <div className="flex flex-wrap items-stretch justify-center gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-xl border border-white/25 bg-black/40 px-5 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:border-white/45 hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            Exit
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-xl bg-cyan-300 px-5 text-sm font-bold text-[#041018] transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Next Scene
            </button>
          ) : (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-xl bg-cyan-300 px-5 text-sm font-bold text-[#041018] transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Back to GridCheck
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
