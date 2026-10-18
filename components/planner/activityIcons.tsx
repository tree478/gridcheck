import type { ActivityId } from "@/lib/types";

/** Small decorative icons for planner tiles. */
export default function ActivityIcon({ id }: { id: ActivityId }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "text-primary",
  };

  switch (id) {
    case "washer":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="13" r="5" />
          <circle cx="8" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "dryer":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="13" r="5" />
          <path d="M10 12.5c1-1.5 3-1.5 4 0" />
        </svg>
      );
    case "dishwasher":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M4 9h16" />
          <path d="M8 13h2M12 13h2M14 16h2" />
        </svg>
      );
    case "ev":
      return (
        <svg {...common}>
          <path d="M5 16h14l-1.5-6.5A2 2 0 0 0 15.6 8H8.4a2 2 0 0 0-1.9 1.5L5 16Z" />
          <circle cx="8" cy="16.5" r="1.5" />
          <circle cx="16" cy="16.5" r="1.5" />
          <path d="M11 5l-1.5 3h3L11 11" />
        </svg>
      );
    case "laptop":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="10" rx="1.5" />
          <path d="M3 17h18" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}
