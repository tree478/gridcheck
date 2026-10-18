"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  getSessionUsername,
  subscribeSession,
} from "@/components/auth/sessionStore";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/plan", label: "Plan" },
  { href: "/impact", label: "Impact" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isProfileActive(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/")
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const profileActive = isProfileActive(pathname);
  const sessionUsername = useSyncExternalStore(
    subscribeSession,
    getSessionUsername,
    () => null,
  );

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 text-xl font-extrabold tracking-tight text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary-tint"
            aria-hidden
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 11.5c2-4 3.5-4 5-1.5s3 4 5 1.5 2-4 2-4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          GridCheck
        </Link>
        <div className="flex flex-wrap items-center gap-x-1">
          <nav aria-label="Main">
            <ul className="flex flex-wrap items-center gap-x-1">
              {NAV_ITEMS.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center rounded-[var(--radius-button)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        active
                          ? "bg-ink font-semibold text-white"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
              <li>
                {sessionUsername ? (
                  <span
                    className="flex min-h-11 items-center px-3 text-sm font-semibold text-primary"
                    aria-live="polite"
                    aria-label={`Logged in as ${sessionUsername}`}
                  >
                    {sessionUsername}
                  </span>
                ) : (
                  <Link
                    href="/login"
                    aria-current={profileActive ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-[var(--radius-button)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      profileActive
                        ? "bg-ink font-semibold text-white"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Profile
                  </Link>
                )}
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
