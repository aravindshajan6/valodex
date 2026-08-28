import Link from "next/link";
import { Container } from "@/components/ui";
import { RevealGroup } from "@/components/motion";

export type SeeAlsoLink = { href: string; label: string; hint: string };

/** Compact cross-link strip shared by /ranks, /seasons and /gamemodes. */
export function SeeAlso({ links }: { links: SeeAlsoLink[] }) {
  return (
    <section className="border-t border-line py-12">
      <Container>
        <RevealGroup>
          <div data-reveal className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-mute">
            <span className="h-px w-8 bg-line" />
            See also
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                data-reveal
                className="group chamfer-sm flex items-center justify-between gap-4 border border-line bg-ink-2 px-4 py-3 transition-colors hover:border-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo"
              >
                <span>
                  <span className="display block text-2xl text-bone">{l.label}</span>
                  <span className="block text-xs text-bone-2">{l.hint}</span>
                </span>
                <span aria-hidden className="font-mono text-red transition-transform duration-300 ease-out-expo group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        </RevealGroup>
      </Container>
    </section>
  );
}
