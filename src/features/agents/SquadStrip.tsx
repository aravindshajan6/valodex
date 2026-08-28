import Image from "next/image";
import Link from "next/link";
import { RevealGroup } from "@/components/motion";
import { Container, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/cn";
import { agentPalette, cardGradient } from "./gradient";

export type SquadMember = { slug: string; name: string; portrait: string | null; gradientColors: string[] | null };

/** Same-role agents linking to their own dossiers. */
export function SquadStrip({ roleName, members }: { roleName: string; members: SquadMember[] }) {
  if (!members.length) return null;
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <RevealGroup>
          <SectionHeading eyebrow={`Same role // ${roleName}`} title={<>The {roleName} squad</>} className="mb-10" />
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
            {members.map((m) => {
              const p = agentPalette(m.gradientColors);
              return (
                <li key={m.slug} data-reveal>
                  <Link
                    href={`/agents/${m.slug}`}
                    className="group chamfer relative block aspect-[4/5] overflow-hidden border border-line bg-ink-3 outline-none transition-[border-color] duration-300 hover:border-red/70 focus-visible:border-holo"
                    aria-label={m.name}
                  >
                    <div aria-hidden className="absolute inset-0" style={{ backgroundImage: cardGradient(p) }} />
                    {m.portrait && (
                      <Image
                        src={m.portrait}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 200px, 33vw"
                        className={cn("object-cover object-top transition-transform duration-500 ease-out-expo group-hover:scale-110")}
                        style={{ objectPosition: "50% 8%" }}
                      />
                    )}
                    <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink to-transparent" />
                    <span className="display absolute inset-x-2 bottom-2 truncate text-lg text-bone transition-colors group-hover:text-red sm:text-xl">{m.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </RevealGroup>
      </Container>
    </section>
  );
}
