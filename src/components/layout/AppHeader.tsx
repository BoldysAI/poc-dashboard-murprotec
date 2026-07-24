"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PostPocInfoButton } from "@/components/poc/PostPocInfoButton";

const NAV_ITEMS = [
  { href: "/tresorerie", label: "Trésorerie Groupe" },
  { href: "/reporting", label: "Reporting Financier" },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-surface bg-primary text-white print:hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href="/tresorerie"
          className="inline-flex shrink-0 cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Image
            src="/logo_murpro_group.png"
            alt="Murpro Group"
            width={275}
            height={54}
            priority
            className="h-[54px] w-auto bg-white px-2 py-1"
          />
        </Link>

        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <nav
            aria-label="Navigation principale"
            className="flex flex-wrap gap-1"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "cursor-pointer rounded px-4 py-2.5 text-sm font-medium transition-colors duration-200",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    isActive
                      ? "border-b-2 border-accent text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <PostPocInfoButton />
        </div>
      </div>
    </header>
  );
}
