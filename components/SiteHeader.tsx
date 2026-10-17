"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <Link
          href="/"
          className="flex min-h-11 items-center text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          GridWait
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
                      className={`flex min-h-11 items-center border-b-2 px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                        active
                          ? "border-emerald-600 font-semibold text-zinc-900 dark:border-emerald-400 dark:text-zinc-50"
                          : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <Link
            href="/login"
            aria-current={isActive(pathname, "/login") ? "page" : undefined}
            className={`flex min-h-11 items-center px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              isActive(pathname, "/login")
                ? "font-semibold text-zinc-900 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            aria-current={isActive(pathname, "/signup") ? "page" : undefined}
            className={`flex min-h-11 items-center px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              isActive(pathname, "/signup")
                ? "font-semibold text-zinc-900 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
