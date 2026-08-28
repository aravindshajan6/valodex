import Link from "next/link";
import { Container } from "@/components/ui";

type Neighbor = { slug: string; name: string } | null;

/** Prev / next agent links at the foot of a dossier. */
export function AgentPager({ prev, next }: { prev: Neighbor; next: Neighbor }) {
  if (!prev && !next) return null;
  const cls =
    "group chamfer flex flex-1 flex-col gap-2 border border-line bg-ink-2 p-5 outline-none transition-[border-color,background-color] duration-300 hover:border-red/70 hover:bg-ink-3 focus-visible:border-holo sm:p-7";
  return (
    <nav aria-label="Agent pagination" className="pb-24 sm:pb-32">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row">
          {prev && (
            <Link href={`/agents/${prev.slug}`} className={cls} rel="prev">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-mute">
                <span aria-hidden className="mr-2 inline-block transition-transform group-hover:-translate-x-1">←</span>Previous agent
              </span>
              <span className="display text-3xl text-bone transition-colors group-hover:text-red sm:text-4xl">{prev.name}</span>
            </Link>
          )}
          {next && (
            <Link href={`/agents/${next.slug}`} className={`${cls} sm:items-end sm:text-right`} rel="next">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-mute">
                Next agent<span aria-hidden className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
              <span className="display text-3xl text-bone transition-colors group-hover:text-red sm:text-4xl">{next.name}</span>
            </Link>
          )}
        </div>
      </Container>
    </nav>
  );
}
