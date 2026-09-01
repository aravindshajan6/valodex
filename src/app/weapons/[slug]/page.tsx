import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RevealGroup } from "@/components/motion";
import { Badge, Container, FavouriteButton, Panel, SectionHeading, Stat } from "@/components/ui";
import { DamageFalloffChart } from "@/features/weapons/DamageFalloffChart";
import { SkinGallery } from "@/features/weapons/SkinGallery";
import { WeaponHeroVisual } from "@/features/weapons/WeaponHeroVisual";
import { toSkinSummaries, toWeaponSummary } from "@/features/weapons/serialize";
import { CATEGORY_LABELS, FEATURE_LABELS, formatCredits, pct } from "@/features/weapons/shop";
import { getWeaponBySlug, listWeaponSlugs } from "@/lib/queries/weapons";
import { damageRangeAt } from "@/lib/ttk";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await listWeaponSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const row = await getWeaponBySlug(slug);
  if (!row) return { title: "Weapon not found" };
  const w = toWeaponSummary(row);
  return { title: w.name, description: `${w.name} — ${CATEGORY_LABELS[w.category] ?? w.category}: damage falloff, fire rate, ADS stats and every skin.` };
}

function humanize(v: string | null | undefined): string {
  return (v ?? "").replace(/-/g, " ");
}

export default async function WeaponPage({ params }: Params) {
  const { slug } = await params;
  const row = await getWeaponBySlug(slug);
  if (!row) notFound();

  const w = toWeaponSummary(row, row.skins.length);
  const skins = toSkinSummaries(row);
  const pellets = Math.max(1, w.shotgunPelletCount ?? 1);
  const r0 = damageRangeAt(w.damageRanges, 0);
  const isMelee = w.category === "melee";

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[78dvh] overflow-hidden pt-28">
        {w.displayIcon && <WeaponHeroVisual icon={w.displayIcon} name={w.name} />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-ink/60" />
        <Container className="pointer-events-none relative flex min-h-[calc(78dvh-7rem)] flex-col justify-end pb-14">
          <RevealGroup>
            <nav aria-label="Breadcrumb" data-reveal className="pointer-events-auto mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-mute">
              <Link href="/weapons" className="hover:text-bone">Weapons</Link>
              <span className="mx-2">/</span>
              <span className="text-red">{w.shopCategoryLabel || CATEGORY_LABELS[w.category]}</span>
            </nav>
            <h1 data-reveal className="display text-7xl text-bone sm:text-8xl lg:text-[9rem]">
              {w.name}
            </h1>
            <div data-reveal className="pointer-events-auto mt-6 flex flex-wrap items-center gap-2">
              <Badge tone="red">{CATEGORY_LABELS[w.category] ?? w.category}</Badge>
              {w.feature && <Badge tone="holo">{FEATURE_LABELS[w.feature] ?? humanize(w.feature)}</Badge>}
              {w.fireMode && <Badge>{humanize(w.fireMode)}</Badge>}
              {w.altFireType && <Badge>Alt: {humanize(w.altFireType)}</Badge>}
              {w.wallPenetration && <Badge tone={w.wallPenetration === "high" ? "gold" : "neutral"}>Wall pen {w.wallPenetration}</Badge>}
              <FavouriteButton kind="weapons" id={w.uuid} name={w.name} variant="pill" className="ml-2" />
            </div>
            <div data-reveal className="pointer-events-auto mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mute">Cost</span>
                <span className="font-mono text-4xl tabular-nums text-bone">
                  <span aria-hidden className="mr-2 text-holo">◈</span>
                  {isMelee ? "FREE" : formatCredits(w.cost)}
                </span>
              </div>
              {!isMelee && (
                <Link
                  href={`/tools/ttk?w=${w.slug}`}
                  className="chamfer-sm inline-flex items-center gap-2 border border-holo/50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-holo outline-none transition-colors hover:bg-holo/10 focus-visible:ring-1 focus-visible:ring-holo"
                >
                  Time to kill <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          </RevealGroup>
        </Container>
      </section>

      {/* Stats */}
      {!isMelee && (
        <section className="py-16 sm:py-20">
          <Container>
            <RevealGroup>
              <SectionHeading eyebrow="Handling" title="Stats" />
              <Panel className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 p-6 sm:grid-cols-3 lg:grid-cols-6 sm:p-8">
                {w.fireRate != null && <Stat label="Fire rate" value={w.fireRate} unit="/s" />}
                {w.magazineSize != null && <Stat label="Magazine" value={w.magazineSize} unit="rds" />}
                {w.reloadTimeSeconds != null && <Stat label="Reload" value={w.reloadTimeSeconds} unit="s" />}
                {w.equipTimeSeconds != null && <Stat label="Equip" value={w.equipTimeSeconds} unit="s" />}
                {w.runSpeedMultiplier != null && <Stat label="Run speed" value={pct(w.runSpeedMultiplier)} />}
                {w.firstBulletAccuracy != null && <Stat label="1st bullet spread" value={w.firstBulletAccuracy} unit="°" />}
                {pellets > 1 && <Stat label="Pellets" value={pellets} />}
                {r0 && <Stat label="Head @ 0m" value={r0.headDamage * pellets} />}
                {r0 && <Stat label="Body @ 0m" value={r0.bodyDamage * pellets} />}
              </Panel>
            </RevealGroup>
          </Container>
        </section>
      )}

      {/* Damage falloff + ADS */}
      {w.damageRanges.length > 0 && (
        <section className="border-t border-line py-16 sm:py-20">
          <Container>
            <RevealGroup>
              <SectionHeading eyebrow="Damage" title="Falloff" description={`Damage per ${pellets > 1 ? "shell (all pellets)" : "bullet"} by distance. Brackets step at the ranges Riot defines for the ${w.name}.`} />
            </RevealGroup>
            <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Panel className="p-5 sm:p-7">
                <DamageFalloffChart ranges={w.damageRanges} pellets={pellets} weaponName={w.name} />
              </Panel>
              <div className="flex flex-col gap-6">
                {w.adsStats && (
                  <RevealGroup>
                    <Panel className="p-6">
                      <div data-reveal className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-holo">
                        <span className="h-px w-6 bg-holo" /> Aim down sights
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                        <Stat label="Zoom" value={w.adsStats.zoomMultiplier} unit="×" />
                        {w.adsStats.fireRate > 0 && <Stat label="Fire rate" value={Number(w.adsStats.fireRate.toFixed(2))} unit="/s" />}
                        <Stat label="Run speed" value={pct(w.adsStats.runSpeedMultiplier)} />
                        {w.adsStats.burstCount > 1 && <Stat label="Burst" value={w.adsStats.burstCount} unit="rds" />}
                        {w.adsStats.firstBulletAccuracy >= 0 && <Stat label="1st bullet spread" value={w.adsStats.firstBulletAccuracy} unit="°" />}
                      </div>
                    </Panel>
                  </RevealGroup>
                )}
                {w.altShotgunStats && (
                  <RevealGroup>
                    <Panel className="p-6">
                      <div data-reveal className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-holo">
                        <span className="h-px w-6 bg-holo" /> Alt fire · burst
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                        <Stat label="Pellets" value={w.altShotgunStats.shotgunPelletCount} />
                        <Stat label="Burst rate" value={w.altShotgunStats.burstRate} unit="/s" />
                      </div>
                    </Panel>
                  </RevealGroup>
                )}
                {w.airBurstStats && (
                  <RevealGroup>
                    <Panel className="p-6">
                      <div data-reveal className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-holo">
                        <span className="h-px w-6 bg-holo" /> Alt fire · air burst
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                        <Stat label="Pellets" value={w.airBurstStats.shotgunPelletCount} />
                        <Stat label="Burst at" value={w.airBurstStats.burstDistance} unit="m" />
                      </div>
                    </Panel>
                  </RevealGroup>
                )}
                <RevealGroup>
                  <Panel className="p-6">
                    <div data-reveal className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-mute">Reading the chart</div>
                    <p data-reveal className="text-sm leading-relaxed text-bone-2">
                      Reference lines mark 100 HP (unarmored) and 150 HP (heavy armor). Where a line sits above them, that hit is a one-shot. Armor absorbs 66% of a hit until it is gone — see the{" "}
                      <Link href={`/tools/ttk?w=${w.slug}`} className="text-holo underline-offset-4 hover:underline">TTK calculator</Link> for the full model.
                    </p>
                  </Panel>
                </RevealGroup>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Skins */}
      <section className="border-t border-line py-16 sm:py-20">
        <Container>
          <RevealGroup>
            <SectionHeading eyebrow="Cosmetics" title="Skins" description={`${skins.length} skins for the ${w.name}. Filter by tier, open one to flip through chromas and level videos.`} />
          </RevealGroup>
          <div className="mt-10">
            <SkinGallery weaponSlug={w.slug} weaponName={w.name} skins={skins} />
          </div>
        </Container>
      </section>
    </>
  );
}
