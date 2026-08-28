import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { countsLabel } from "@/components/bundles/BundleCard";
import { RevealGroup } from "@/components/motion";
import { SkinCard, type SkinCardData } from "@/components/skins/SkinCard";
import { hexColor, WEAPON_CATEGORY_ORDER } from "@/components/skins/tier";
import { Badge, Container, SectionHeading } from "@/components/ui";
import { t } from "@/lib/i18n";
import { getBundleBySlug, listBundleSlugs } from "@/lib/queries/skins";

export const revalidate = 3600;

/** 322 bundles is cheap to prerender; unknown slugs still resolve on demand. */
export async function generateStaticParams() {
  const rows = await listBundleSlugs();
  return rows.map((r) => ({ slug: r.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) return { title: "Bundle not found" };
  const name = t(bundle.displayName);
  return {
    title: `${name} bundle`,
    description: t(bundle.promoDescription) || t(bundle.description) || `${name} — ${countsLabel(counts(bundle)) || "Valorant store bundle"}.`,
    openGraph: bundle.displayIcon ? { images: [bundle.displayIcon] } : undefined,
  };
}

function counts(b: NonNullable<Awaited<ReturnType<typeof getBundleBySlug>>>) {
  return { skins: b.skins.length, cards: b.cards.length, sprays: b.sprays.length, buddies: b.buddies.length };
}

export default async function BundlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) notFound();

  const name = t(bundle.displayName);
  const sub = t(bundle.displayNameSubText);
  const description = [t(bundle.description), t(bundle.promoDescription), t(bundle.extraDescription)]
    .map((s) => s.trim())
    .filter((s, i, arr) => s && s.toLowerCase() !== name.toLowerCase() && arr.indexOf(s) === i);
  const c = counts(bundle);
  const total = c.skins + c.cards + c.sprays + c.buddies;

  const skins: SkinCardData[] = [...bundle.skins]
    .sort((a, b) => WEAPON_CATEGORY_ORDER.indexOf(a.weaponCategory) - WEAPON_CATEGORY_ORDER.indexOf(b.weaponCategory) || a.weaponSlug.localeCompare(b.weaponSlug))
    .map((s) => ({
      uuid: s.uuid,
      name: t(s.displayName),
      href: `/skins/${s.weaponSlug}/${s.slug}`,
      icon: s.displayIcon,
      weaponName: t(s.weaponName),
      tier: { devName: s.tier, name: s.tier, rank: s.tierRank, color: hexColor(s.tierColor), icon: s.tierIcon },
    }));
  const topTier = bundle.skins.reduce<{ name: string; color: string; rank: number } | null>(
    (best, s) => (!best || s.tierRank > best.rank ? { name: s.tier, color: hexColor(s.tierColor), rank: s.tierRank } : best),
    null,
  );
  const accent = topTier?.color ?? "#ff4655";

  return (
    <>
      {/* ---- hero ------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 -z-10">
          {bundle.displayIcon && (
            <Image src={bundle.displayIcon} alt="" fill priority sizes="100vw" className="object-cover object-center" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/70 to-ink" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/30 to-transparent" />
        </div>
        <Container className="relative flex min-h-[60vh] flex-col justify-end pb-14 pt-6 sm:pb-20">
          <RevealGroup>
            <nav aria-label="Breadcrumb" data-reveal className="mb-8">
              <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-bone-2">
                <li><Link href="/bundles" className="hover:text-bone">Bundles</Link></li>
                <li aria-hidden className="text-mute">/</li>
                <li className="text-bone" aria-current="page">{name}</li>
              </ol>
            </nav>
            {bundle.logoIcon && (
              <div data-reveal className="relative mb-6 h-20 w-full max-w-md sm:h-28">
                <Image src={bundle.logoIcon} alt="" fill sizes="448px" priority className="object-contain object-left drop-shadow-[0_6px_24px_rgba(0,0,0,0.8)]" />
              </div>
            )}
            <div data-reveal className="mb-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: accent }}>
              <span className="h-px w-8" style={{ background: accent }} />
              Bundle{topTier ? ` · ${topTier.name} edition` : ""}
            </div>
            <h1 data-reveal className="display text-5xl text-bone sm:text-6xl lg:text-8xl">{name}</h1>
            {sub && <p data-reveal className="mt-3 text-lg text-bone-2">{sub}</p>}
            {description.map((d) => (
              <p key={d} data-reveal className="mt-4 max-w-2xl text-base leading-relaxed text-bone-2">{d}</p>
            ))}
            <div data-reveal className="mt-6 flex flex-wrap gap-2">
              {c.skins > 0 && <Badge tone="red">{c.skins} skins</Badge>}
              {c.cards > 0 && <Badge tone="holo">{c.cards} cards</Badge>}
              {c.sprays > 0 && <Badge tone="holo">{c.sprays} sprays</Badge>}
              {c.buddies > 0 && <Badge tone="gold">{c.buddies} buddies</Badge>}
              {bundle.themes.length > 1 && <Badge>{bundle.themes.length} themes merged</Badge>}
            </div>
          </RevealGroup>
        </Container>
      </section>

      {/* ---- contents ---------------------------------------------------------- */}
      {total === 0 ? (
        <section className="py-14 sm:py-20">
          <Container>
            <RevealGroup>
              <div data-reveal className="chamfer border border-line bg-ink-3 px-6 py-14 text-center sm:px-10">
                <p className="display text-3xl text-bone sm:text-4xl">Contents unknown</p>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-bone-2">
                  {bundle.themes.length
                    ? `This bundle maps to the "${bundle.themes.map((th) => th.name).join('", "')}" theme, but no skins, cards, sprays or buddies carry it yet.`
                    : "valorant-api.com doesn't list bundle contents, and no cosmetic theme matches this bundle's name or asset key, so we can't reconstruct what's inside."}
                </p>
                <Link href="/skins" className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.25em] text-red hover:text-bone">Browse all skins →</Link>
              </div>
            </RevealGroup>
          </Container>
        </section>
      ) : (
        <>
          {skins.length > 0 && (
            <section className="py-14 sm:py-20">
              <Container>
                <RevealGroup>
                  <SectionHeading eyebrow={`${skins.length} in bundle`} title="Weapon skins" className="mb-8" />
                </RevealGroup>
                <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {skins.map((s, i) => (
                    <div key={s.uuid} data-reveal>
                      <SkinCard skin={s} priority={i < 4} />
                    </div>
                  ))}
                </RevealGroup>
              </Container>
            </section>
          )}

          {bundle.cards.length > 0 && (
            <section className="border-t border-line py-14 sm:py-20">
              <Container>
                <RevealGroup>
                  <SectionHeading eyebrow={`${bundle.cards.length} in bundle`} title="Player cards" className="mb-8" />
                  <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                    {bundle.cards.map((card) => {
                      const cname = t(card.displayName);
                      const art = card.wideArt ?? card.largeArt ?? card.displayIcon;
                      return (
                        <li key={card.uuid} data-reveal className="chamfer border border-line bg-ink-3">
                          <div className="relative aspect-[452/128] w-full">
                            {art && <Image src={art} alt={cname} fill sizes="(min-width: 640px) 50vw, 100vw" loading="lazy" className="object-cover" />}
                          </div>
                          <p className="border-t border-line/70 px-4 py-3 text-sm text-bone">{cname}</p>
                        </li>
                      );
                    })}
                  </ul>
                </RevealGroup>
              </Container>
            </section>
          )}

          {bundle.sprays.length > 0 && (
            <section className="border-t border-line py-14 sm:py-20">
              <Container>
                <RevealGroup>
                  <SectionHeading eyebrow={`${bundle.sprays.length} in bundle`} title="Sprays" className="mb-8" />
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
                    {bundle.sprays.map((spray) => {
                      const sname = t(spray.displayName);
                      const art = spray.animationGif ?? spray.fullTransparentIcon ?? spray.displayIcon;
                      return (
                        <li key={spray.uuid} data-reveal className="chamfer border border-line bg-ink-3">
                          <div className="relative aspect-square w-full">
                            {art && <Image src={art} alt={sname} fill sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 50vw" loading="lazy" unoptimized={art.endsWith(".gif")} className="object-contain p-4" />}
                          </div>
                          <p className="truncate border-t border-line/70 px-3 py-2 text-xs text-bone">{sname}</p>
                        </li>
                      );
                    })}
                  </ul>
                </RevealGroup>
              </Container>
            </section>
          )}

          {bundle.buddies.length > 0 && (
            <section className="border-t border-line py-14 sm:py-20">
              <Container>
                <RevealGroup>
                  <SectionHeading eyebrow={`${bundle.buddies.length} in bundle`} title="Gun buddies" className="mb-8" />
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8">
                    {bundle.buddies.map((buddy) => {
                      const bname = t(buddy.displayName);
                      return (
                        <li key={buddy.uuid} data-reveal className="chamfer border border-line bg-ink-3">
                          <div className="relative aspect-square w-full">
                            {buddy.displayIcon && <Image src={buddy.displayIcon} alt={bname} fill sizes="(min-width: 1024px) 12vw, (min-width: 640px) 25vw, 33vw" loading="lazy" className="object-contain p-3" />}
                          </div>
                          <p className="truncate border-t border-line/70 px-2 py-2 text-center text-[11px] text-bone">{bname}</p>
                        </li>
                      );
                    })}
                  </ul>
                </RevealGroup>
              </Container>
            </section>
          )}
        </>
      )}
    </>
  );
}
