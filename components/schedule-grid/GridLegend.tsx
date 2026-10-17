type Props = {
  /** When true, show busy / option keys for the plan calendar. */
  overlays?: boolean;
  /** Greenest key only when an awake Greenest block is on the grid. */
  showGreenest?: boolean;
};

export default function GridLegend({
  overlays = false,
  showGreenest = false,
}: Props) {
  if (!overlays) return null;

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-4 w-6 rounded bg-busy"
        />
        Your events
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-4 w-6 rounded bg-scale-dirty"
        />
        Recommended
      </li>
      {showGreenest && (
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-4 w-6 rounded bg-primary"
          />
          Greenest
        </li>
      )}
    </ul>
  );
}
