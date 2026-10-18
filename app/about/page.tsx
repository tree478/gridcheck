import type { Metadata } from "next";
import TeamCard from "@/components/about/TeamCard";

export const metadata: Metadata = { title: "About · GridCheck" };

const TEAM = [
  {
    name: "Miranda Liskov",
    role: "Frontend & Product Development",
    school: "University of Massachusetts Amherst · 2029",
    bio: "Computer Science, Sustainable Energy & Materials",
  },
  {
    name: "Soumya Shelke",
    role: "Data and Integration",
    school: "University of Massachusetts Amherst · 2029",
    bio: "Computer Science, Math, Business",
  },
  {
    name: "Anish Pandey",
    role: "Backend",
    school: "University of Massachusetts Amherst · 2029",
    bio: "Computer Science, Math",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex-1 bg-bg">
      <article className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
        <header>
          <p className="font-mono text-mono-label font-semibold uppercase tracking-[0.12em] text-muted md:text-mono-label-desktop">
            About
          </p>
          <h1 className="mt-3 text-h1 font-extrabold tracking-tight text-ink md:text-h1-desktop">
            About GridCheck
          </h1>
          <p className="mt-3 max-w-2xl text-body text-secondary md:text-body-desktop">
            Why we built it, and who built it.
          </p>
        </header>

        <section
          aria-labelledby="purpose-heading"
          className="mt-8 rounded-[var(--radius-card)] bg-primary-tint px-5 py-6 sm:px-8 sm:py-8"
        >
          <p className="font-mono text-mono-label font-semibold uppercase tracking-[0.12em] text-primary md:text-mono-label-desktop">
            Our purpose
          </p>
          <h2
            id="purpose-heading"
            className="mt-3 text-xl font-extrabold leading-snug tracking-tight text-ink sm:text-2xl md:text-[1.75rem]"
          >
            GridCheck helps people run their energy-hungry chores at the hours
            when the grid is cleanest, without rearranging their lives.
          </h2>
          <p className="mt-4 max-w-3xl text-body leading-relaxed text-callout md:text-body-desktop">
            We think small, well-timed choices add up, and that the numbers we
            show should be honest about what they are. Every figure in GridCheck
            is labeled as a modeled estimate.
          </p>
        </section>

        <section className="mt-14" aria-labelledby="team-heading">
          <h2
            id="team-heading"
            className="text-h2 font-extrabold tracking-tight text-ink md:text-h2-desktop"
          >
            The Team
          </h2>
          <p className="mt-2 max-w-2xl text-body text-secondary md:text-body-desktop">
            Built in 36 hours at HackHarvard 2026 for the ASUS &ldquo;Save the
            Earth&rdquo; sustainability track.
          </p>
          <ul className="mt-6 grid w-full grid-cols-3 gap-2 sm:gap-4">
            {TEAM.map((member, i) => (
              <li key={i} className="min-w-0">
                <TeamCard {...member} />
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
