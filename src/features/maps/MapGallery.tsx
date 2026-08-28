import Image from "next/image";
import { Panel } from "@/components/ui";

type Props = {
  name: string;
  stylized: string | null;
  background: string | null;
  listViewIcon: string | null;
  listViewIconTall: string | null;
  premier: string | null;
};

/** For maps without a tactical minimap: stylised key art plus the list icons. */
export function MapGallery({ name, stylized, background, listViewIcon, listViewIconTall, premier }: Props) {
  const hero = stylized ?? background;
  return (
    <div className="grid gap-4 sm:gap-6">
      {hero && (
        <div data-reveal className="chamfer relative aspect-[21/9] overflow-hidden border border-line bg-ink-3">
          <Image src={hero} alt={`${name} key art`} fill sizes="(min-width: 1280px) 1280px, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
          <span className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.3em] text-holo">{stylized ? "Stylized art" : "Background"}</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {listViewIcon && (
          <Panel className="sm:col-span-2">
            <div data-reveal className="relative aspect-video">
              <Image src={listViewIcon} alt={`${name} list icon`} fill sizes="(min-width: 640px) 60vw, 100vw" className="object-cover" />
            </div>
            <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.3em] text-mute">List icon</span>
          </Panel>
        )}
        {listViewIconTall && (
          <Panel>
            <div data-reveal className="relative aspect-[3/4] sm:aspect-auto sm:h-full">
              <Image src={listViewIconTall} alt={`${name} tall list icon`} fill sizes="(min-width: 640px) 30vw, 100vw" className="object-cover" />
            </div>
            <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.3em] text-mute">Tall icon</span>
          </Panel>
        )}
        {premier && (
          <Panel className="sm:col-span-3">
            <div data-reveal className="relative aspect-[21/9]">
              <Image src={premier} alt={`${name} premier background`} fill sizes="(min-width: 1280px) 1280px, 100vw" className="object-cover" />
            </div>
            <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.3em] text-mute">Premier</span>
          </Panel>
        )}
      </div>
    </div>
  );
}
