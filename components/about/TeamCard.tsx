type Props = {
  name: string;
  role: string;
  school: string;
  bio: string;
};

export default function TeamCard({ name, role, school, bio }: Props) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm sm:p-5">
      <h3 className="text-h3 font-bold text-ink md:text-h3-desktop">{name}</h3>
      <p className="mt-1 text-sm font-semibold text-primary">{role}</p>
      <p className="mt-1 break-words text-sm text-muted">{school}</p>
      <p className="mt-3 text-sm leading-relaxed text-secondary">{bio}</p>
    </article>
  );
}
