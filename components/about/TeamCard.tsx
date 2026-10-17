import Image from "next/image";

type Props = {
  name: string;
  role: string;
  school: string;
  bio: string;
  imageSrc?: string;
};

export default function TeamCard({ name, role, school, bio, imageSrc }: Props) {
  return (
    <article className="flex h-full min-h-[17.5rem] min-w-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm sm:min-h-[19rem] sm:p-5">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={`Photo of ${name}`}
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-chip text-muted"
          aria-hidden
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="8"
              r="3.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      <h3 className="mt-4 line-clamp-2 min-h-[2.6em] text-h3 font-bold text-ink md:text-h3-desktop">
        {name}
      </h3>
      <p className="mt-1 line-clamp-2 min-h-[2.5em] text-sm font-semibold text-primary">
        {role}
      </p>
      <p className="mt-1 line-clamp-2 min-h-[2.5em] break-words text-sm text-muted">
        {school}
      </p>
      <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-secondary">
        {bio}
      </p>
    </article>
  );
}
