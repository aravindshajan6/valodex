import Link from "next/link";
import { NAV_LINKS, SITE } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <div className="display text-3xl">Valo<span className="text-red">rum</span></div>
          <p className="mt-3 max-w-md text-sm text-bone-2">
            A codex for Valorant built on live game data from{" "}
            <a href={SITE.source.href} className="text-bone underline decoration-line hover:decoration-red" target="_blank" rel="noreferrer">{SITE.source.label}</a>.
          </p>
          <p className="mt-4 text-xs text-mute max-w-md">
            Valorum isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-bone-2">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-bone">{l.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
