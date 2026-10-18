type Props = {
  message?: string;
};

export default function CampusLoading({
  message = "Generating the invisible campus…",
}: Props) {
  return (
    <div
      className="campus-loading-shimmer absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-cyan-200/70">
        The Invisible Campus
      </p>
      <p className="mt-4 max-w-sm text-lg font-semibold tracking-tight text-white sm:text-xl">
        {message}
      </p>
      <p className="mt-3 max-w-xs text-sm text-white/55">
        Artistic illustrations powered by Grok Imagine. This may take a moment.
      </p>
      <div className="mt-8 flex gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-cyan-300/80"
            style={{
              animation: "campus-glow 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.22}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
