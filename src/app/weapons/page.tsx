import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHero, Stat } from "@/components/ui";
import { WeaponsBrowser } from "@/features/weapons/WeaponsBrowser";
import { toWeaponSummary } from "@/features/weapons/serialize";
import { countSkinsByWeapon, listWeapons } from "@/lib/queries/weapons";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Weapons",
  description: "Every Valorant weapon laid out like the buy menu — cost, fire rate, damage falloff, ADS stats and skins.",
};

export default async function WeaponsPage() {
  const [rows, skinCounts] = await Promise.all([listWeapons(), countSkinsByWeapon()]);
  const weapons = rows.map((r) => toWeaponSummary(r, skinCounts.get(r.uuid) ?? 0));
  const guns = weapons.filter((w) => w.category !== "melee");
  const maxCost = Math.max(0, ...guns.map((w) => w.cost ?? 0));
  const totalSkins = weapons.reduce((n, w) => n + w.skinCount, 0);

  return (
    <>
      <PageHero
        eyebrow="Armory · Buy menu"
        title={
          <>
            Weap<span className="text-red">ons</span>
          </>
        }
        description="Every gun in the shop, stacked the way the buy menu stacks them. Open a weapon for its damage falloff, ADS profile and full skin line, or run the numbers in the TTK calculator."
      >
        <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
          <Stat label="Weapons" value={guns.length} />
          <Stat label="Top price" value={maxCost} unit="cr" />
          <Stat label="Skins" value={totalSkins} />
          <Link
            data-reveal
            href="/tools/ttk"
            className="chamfer-sm inline-flex items-center gap-2 border border-holo/50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-holo outline-none transition-colors hover:bg-holo/10 focus-visible:ring-1 focus-visible:ring-holo"
          >
            TTK calculator <span aria-hidden>→</span>
          </Link>
        </div>
      </PageHero>
      <Container className="pb-24">
        <WeaponsBrowser weapons={weapons} />
      </Container>
    </>
  );
}
