import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RevealGroup } from "@/components/motion";
import { SkinCard, type SkinCardData } from "@/features/skins/SkinCard";
import { SkinLevels, type ShowcaseLevel } from "@/features/skins/SkinLevels";
import { SkinShowcase, type ShowcaseChroma } from "@/features/skins/SkinShowcase";
import { hexColor, oneLine, type TierInfo } from "@/features/skins/tier";
import { Badge, Container, FavouriteButton, SectionHeading } from "@/components/ui";
import { t } from "@/lib/i18n";
import { findBundleForTheme, getSkinByWeaponAndSlug, listSkinsByThemes } from "@/lib/queries/skins";

/**
 * Rendering strategy: ~1,365 tiered skins is too many to prerender at build, so
 * these pages render on demand and are cached with ISR (`revalidate`), no
 * `generateStaticParams`. Unknown weapon/slug pairs 404.
 */
export const revalidate = 3600;

type Params = Promise<{ weapon: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { weapon, slug } = await params;
  const skin = await getSkinByWeaponAndSlug(weapon, slug);
  if (!skin) return { title: "Skin not found" };
  const name = t(skin.displayName);
  const tier = skin.contentTier ? t(skin.contentTier.displayName) : null;
  return {
    title: name,
    description: `${name} — ${tier ?? "weapon skin"} for the ${t(skin.weapon.displayName)}. Chromas, upgrade levels and bundle.`,
    openGraph: skin.displayIcon ? { images: [skin.displayIcon] } : undefined,
  };
}

export default async function SkinPage({ params }: { params: Params }) {
  const { weapon, slug } = await params;
  const skin = await getSkinByWeaponAndSlug(weapon, slug);
  if (!skin) notFound();

  const [bundle, collection] = await Promise.all([
    skin.theme ? findBundleForTheme(skin.theme) : Promise.resolve(null),
    skin.themeUuid ? listSkinsByThemes([skin.themeUuid]) : Promise.resolve([]),
  ]);

  const name = t(skin.displayName);
  const weaponName = t(skin.weapon.displayName);
  const themeName = skin.theme ? t(skin.theme.displayName) : null;
  const tier: TierInfo | null = skin.contentTier
    ? { devName: skin.contentTier.devName, name: t(skin.contentTier.displayName), rank: skin.contentTier.rank, color: hexColor(skin.contentTier.highlightColor), icon: skin.contentTier.displayIcon }
    : null;
  const color = tier?.color ?? "#41e0c2";

  const chromas: ShowcaseChroma[] = skin.chromas.map((c) => ({ uuid: c.uuid, name: t(c.displayName) || name, icon: c.displayIcon, fullRender: c.fullRender, swatch: c.swatch }));
  const levels: ShowcaseLevel[] = skin.levels.map((l) => ({ uuid: l.uuid, name: t(l.displayName) || name, levelItem: l.levelItem, icon: l.displayIcon ?? skin.displayIcon, video: l.streamedVideo }));
  const videoCount = levels.filter((l) => l.video).length;

  const siblings: SkinCardData[] = collection
    .filter((s) => s.uuid !== skin.uuid)
    .map((s) => ({
      uuid: s.uuid,
      name: t(s.displayName),
      href: `/skins/${s.weaponSlug}/${s.slug}`,
      icon: s.displayIcon,
      weaponName: t(s.weaponName),
      tier: { devName: s.tier, name: s.tier, rank: s.tierRank, color: hexColor(s.tierColor), icon: s.tierIcon },
    }));

  return (
    <>
      {/* ---- stage ------------------------------------------------------------- */}
      <section className="relative pt-16">
        <nav aria-label="Breadcrumb" className="absolute left-0 right-0 top-16 z-10">
          <Container className="pt-4">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-bone-2">
              <li><Link href="/skins" className="hover:text-bone">Skins</Link></li>
              <li aria-hidden className="text-mute">/</li>
              <li><Link href={`/weapons/${skin.weapon.slug}`} className="hover:text-bone">{weaponName}</Link></li>
              <li aria-hidden className="text-mute">/</li>
              <li className="text-bone" aria-current="page">{name}</li>
            </ol>
          </Container>
        </nav>
        <SkinShowcase skinName={name} chromas={chromas} fallbackIcon={skin.displayIcon} tier={tier} />
      </section>

      {/* ---- title + meta -------------------------------------------------------- */}
      <section className="relative border-b border-line">
        <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_20rem] lg:gap-16 lg:py-16">
          <RevealGroup>
            <div data-reveal className="mb-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color }}>
              <span className="h-px w-8" style={{ background: color }} />
              {tier ? tier.name : "Weapon skin"} · {weaponName}
            </div>
            <h1 data-reveal className="display text-5xl text-bone sm:text-6xl lg:text-7xl">{name}</h1>
            <p data-reveal className="mt-5 max-w-2xl text-base leading-relaxed text-bone-2 sm:text-lg">
              {themeName ? <>Part of the <span className="text-bone">{themeName}</span> collection</> : "A standalone skin"}
              {chromas.length > 1 ? `, with ${chromas.length} chromas` : ""}
              {levels.length > 1 ? ` and ${levels.length} upgrade levels` : ""}.
              {videoCount ? ` ${videoCount} level${videoCount === 1 ? " has" : "s have"} in-game preview video.` : ""}
            </p>
            <div data-reveal className="mt-6 flex flex-wrap items-center gap-2">
              {tier && <Badge tone={tier.devName === "Ultra" || tier.devName === "Exclusive" ? "gold" : tier.devName === "Premium" ? "red" : "holo"}>{tier.devName} edition</Badge>}
              <Badge>{skin.weapon.category}</Badge>
              {videoCount > 0 && <Badge tone="holo">Video</Badge>}
              <FavouriteButton kind="skins" id={skin.uuid} name={name} variant="pill" className="ml-2" />
            </div>
          </RevealGroup>

          <RevealGroup>
            <dl className="chamfer grid gap-4 border border-line bg-ink-3 p-5">
              <div data-reveal className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Tier</dt>
                <dd className="flex items-center gap-2 text-sm text-bone">
                  {tier?.icon && <Image src={tier.icon} alt="" width={20} height={20} />}
                  {tier?.name ?? "—"}
                </dd>
              </div>
              <div data-reveal className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Weapon</dt>
                <dd className="text-sm"><Link href={`/weapons/${skin.weapon.slug}`} className="text-bone underline-offset-4 hover:text-red hover:underline">{weaponName}</Link></dd>
              </div>
              <div data-reveal className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Collection</dt>
                <dd className="text-right text-sm">
                  {bundle ? (
                    <Link href={`/bundles/${bundle.slug}`} className="text-bone underline-offset-4 hover:text-red hover:underline">{themeName ?? bundle.name} bundle →</Link>
                  ) : (
                    <span className="text-bone">{themeName ?? "—"}</span>
                  )}
                </dd>
              </div>
              <div data-reveal className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Chromas</dt>
                <dd className="font-mono text-sm text-bone tabular-nums">{chromas.length}</dd>
              </div>
              <div data-reveal className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Levels</dt>
                <dd className="font-mono text-sm text-bone tabular-nums">{levels.length}</dd>
              </div>
            </dl>
          </RevealGroup>
        </Container>
      </section>

      {/* ---- levels -------------------------------------------------------------- */}
      {levels.length > 0 && (
        <section className="py-14 sm:py-20">
          <Container>
            <RevealGroup>
              <SectionHeading eyebrow="Upgrade path" title="Levels" description="Hover, focus or tap a card to play its in-game preview. Videos stream from Riot's CDN and only load when played." className="mb-8" />
            </RevealGroup>
            <SkinLevels levels={levels} color={color} />
          </Container>
        </section>
      )}

      {/* ---- chroma renders (DOM equivalent of the 3D stage) ----------------------- */}
      {chromas.length > 1 && (
        <section className="border-t border-line py-14 sm:py-20">
          <Container>
            <RevealGroup>
              <SectionHeading eyebrow="Variants" title="Chromas" className="mb-8" />
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {chromas.map((c) => (
                  <li key={c.uuid} data-reveal className="chamfer border border-line bg-ink-3">
                    <div className="relative aspect-[16/9]">
                      {c.icon || c.fullRender ? (
                        <Image src={c.icon ?? c.fullRender!} alt={oneLine(c.name)} fill sizes="(min-width: 1024px) 25vw, 50vw" loading="lazy" className="object-contain p-5" />
                      ) : null}
                    </div>
                    <p className="border-t border-line/70 px-4 py-3 text-sm text-bone">{oneLine(c.name)}</p>
                  </li>
                ))}
              </ul>
            </RevealGroup>
          </Container>
        </section>
      )}

      {/* ---- wallpaper ----------------------------------------------------------- */}
      {skin.wallpaper && (
        <section className="border-t border-line py-14 sm:py-20">
          <Container>
            <RevealGroup>
              <SectionHeading eyebrow="Key art" title="Wallpaper" className="mb-8" />
              <div data-reveal className="chamfer relative aspect-[16/9] w-full border border-line bg-ink-3">
                <Image src={skin.wallpaper} alt={`${name} wallpaper`} fill sizes="(min-width: 1280px) 1280px, 100vw" loading="lazy" className="object-cover" />
              </div>
            </RevealGroup>
          </Container>
        </section>
      )}

      {/* ---- rest of the collection ------------------------------------------------ */}
      {siblings.length > 0 && (
        <section className="border-t border-line py-14 sm:py-20">
          <Container>
            <RevealGroup>
              <SectionHeading eyebrow="Collection" title={<>More {themeName}</>} className="mb-8" />
            </RevealGroup>
            <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {siblings.map((s) => (
                <div key={s.uuid} data-reveal>
                  <SkinCard skin={s} />
                </div>
              ))}
            </RevealGroup>
          </Container>
        </section>
      )}
    </>
  );
}
