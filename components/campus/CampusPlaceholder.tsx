import type { ReactNode } from "react";
import type { CampusSceneId } from "./campusTypes";

type Props = {
  scene: CampusSceneId;
};

/** Cinematic CSS/SVG stand-ins until Grok Imagine image URLs arrive. */
export default function CampusPlaceholder({ scene }: Props) {
  if (scene === "seen") return <SeenCampus />;
  if (scene === "revealed") return <RevealedCampus />;
  return <ThinksCampus />;
}

function SeenCampus() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070c12]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 35%, #1a2840 0%, #0a1018 55%, #05080c 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background:
            "linear-gradient(to top, #0d1520 0%, #152030 40%, transparent 100%)",
        }}
      />
      {/* Soft moon glow */}
      <div className="campus-glow absolute right-[12%] top-[10%] size-28 rounded-full bg-[#c8d4e8]/15 blur-3xl sm:size-40" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {/* Ground */}
        <ellipse cx="600" cy="720" rx="700" ry="90" fill="#0c141c" />
        {/* Quad paths */}
        <path
          d="M200 640 Q600 560 1000 640"
          stroke="#1a2838"
          strokeWidth="40"
          fill="none"
        />
        {/* Buildings — warm brick silhouettes with window lights */}
        <g>
          <rect x="180" y="380" width="140" height="240" fill="#3a1f1c" />
          <rect x="200" y="340" width="100" height="40" fill="#2e1816" />
          {windows(200, 400, 4, 5, "#f0c878")}
          <rect x="360" y="300" width="180" height="320" fill="#4a2820" />
          <polygon points="360,300 450,240 540,300" fill="#2e1816" />
          {windows(380, 330, 5, 6, "#f5d090")}
          <rect x="580" y="360" width="120" height="260" fill="#3d221c" />
          {windows(595, 380, 3, 5, "#e8c070")}
          <rect x="740" y="280" width="200" height="340" fill="#452820" />
          <rect x="780" y="230" width="120" height="50" fill="#2a1614" />
          {windows(760, 310, 6, 7, "#f2cc80")}
          <rect x="980" y="400" width="110" height="220" fill="#38201c" />
          {windows(995, 420, 3, 4, "#e0b868")}
        </g>
        {/* Tree silhouettes */}
        <ellipse cx="140" cy="600" rx="36" ry="70" fill="#0a1218" />
        <ellipse cx="1080" cy="610" rx="40" ry="75" fill="#0a1218" />
        <ellipse cx="520" cy="620" rx="28" ry="55" fill="#0a1218" />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
    </div>
  );
}

function RevealedCampus() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#04080e]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, #0c2438 0%, #061018 60%, #03060a 100%)",
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {/* Translucent building shells */}
        <g fill="rgba(80,140,180,0.12)" stroke="rgba(100,200,220,0.35)" strokeWidth="1.5">
          <rect x="180" y="380" width="140" height="240" />
          <rect x="360" y="300" width="180" height="320" />
          <rect x="580" y="360" width="120" height="260" />
          <rect x="740" y="280" width="200" height="340" />
          <rect x="980" y="400" width="110" height="220" />
        </g>
        {/* Electrical pathways — cyan + amber */}
        <g fill="none" strokeLinecap="round">
          <path
            className="campus-pulse"
            d="M250 500 L450 420 L640 480 L840 380 L1030 500"
            stroke="#22d3ee"
            strokeWidth="2.5"
            opacity="0.85"
          />
          <path
            className="campus-pulse"
            style={{ animationDelay: "0.6s" }}
            d="M250 560 L450 520 L640 540 L840 500 L1030 560"
            stroke="#f59e0b"
            strokeWidth="2"
            opacity="0.7"
          />
          <path
            className="campus-pulse"
            style={{ animationDelay: "1.2s" }}
            d="M320 620 C480 580, 700 600, 900 560"
            stroke="#67e8f9"
            strokeWidth="1.5"
            opacity="0.55"
          />
          <path
            d="M450 420 L450 620 M640 480 L640 640 M840 380 L840 620"
            stroke="rgba(34,211,238,0.25)"
            strokeWidth="1"
          />
        </g>
        {/* Nodes */}
        {[
          [250, 500],
          [450, 420],
          [640, 480],
          [840, 380],
          [1030, 500],
          [450, 520],
          [840, 500],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            className="campus-glow"
            style={{ animationDelay: `${i * 0.35}s` }}
            cx={cx}
            cy={cy}
            r="5"
            fill={i % 2 === 0 ? "#22d3ee" : "#fbbf24"}
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/50" />
    </div>
  );
}

function ThinksCampus() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#03070c]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 45%, #0a3048 0%, #061820 50%, #020508 100%)",
        }}
      />
      <div className="campus-glow absolute left-1/2 top-1/2 size-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <g fill="rgba(34,211,238,0.06)" stroke="rgba(34,211,238,0.2)" strokeWidth="1">
          <rect x="180" y="380" width="140" height="240" />
          <rect x="360" y="300" width="180" height="320" />
          <rect x="580" y="360" width="120" height="260" />
          <rect x="740" y="280" width="200" height="340" />
          <rect x="980" y="400" width="110" height="220" />
        </g>
        {/* Synchronized cyan lattice */}
        <g
          className="campus-pulse"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M250 500 L450 420 L640 480 L840 380 L1030 500" />
          <path d="M250 560 L450 520 L640 540 L840 500 L1030 560" />
          <path d="M320 620 C480 580, 700 600, 900 560" />
          <path d="M450 420 L640 480 L840 380" />
          <path d="M450 520 L640 540 L840 500" />
        </g>
        {[
          [250, 500],
          [450, 420],
          [640, 480],
          [840, 380],
          [1030, 500],
          [250, 560],
          [450, 520],
          [640, 540],
          [840, 500],
          [1030, 560],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            className="campus-glow"
            cx={cx}
            cy={cy}
            r="6"
            fill="#67e8f9"
            opacity="0.9"
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/55" />
    </div>
  );
}

function windows(
  x: number,
  y: number,
  cols: number,
  rows: number,
  color: string,
) {
  const nodes: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Sparse lit windows for a lived-in night look
      if ((r + c) % 3 === 0) continue;
      nodes.push(
        <rect
          key={`${r}-${c}`}
          x={x + c * 22}
          y={y + r * 28}
          width="8"
          height="12"
          fill={color}
          opacity={0.55 + ((r * cols + c) % 4) * 0.1}
        />,
      );
    }
  }
  return <g>{nodes}</g>;
}
