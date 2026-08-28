"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "./links";

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300 ${
        scrolled || open ? "bg-ink/80 backdrop-blur-md border-b border-line" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="display text-2xl tracking-wider text-bone hover:text-red transition-colors">
          Valo<span className="text-red">rum</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                  active ? "text-bone" : "text-bone-2 hover:text-bone"
                }`}
              >
                {l.label}
                <span
                  className={`absolute inset-x-3 -bottom-px h-px bg-red transition-transform duration-300 origin-left ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden flex h-10 w-10 items-center justify-center text-bone"
        >
          <span className="relative block h-3 w-6">
            <span className={`absolute inset-x-0 top-0 h-0.5 bg-current transition-transform ${open ? "translate-y-[5px] rotate-45" : ""}`} />
            <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-current transition-transform ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line bg-ink/95 px-4 py-3 flex flex-col">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="py-3 text-sm font-semibold uppercase tracking-[0.18em] text-bone-2 hover:text-bone">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
