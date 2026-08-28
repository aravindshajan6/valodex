import { Container, SectionHeading, Stat } from "@/components/ui";
import { RevealGroup } from "@/components/motion";
import SmokeScene from "@/components/home/SmokeScene.lazy";

export default function Home() {
  return (
    <section className="relative min-h-dvh overflow-hidden pt-32">
      <SmokeScene />
      <Container className="relative">
        <RevealGroup>
          <SectionHeading as="h1" eyebrow="Foundation smoke test" title={<>Valo<span className="text-red">rum</span></>} description="Placeholder home. Agents replace this." />
          <div className="mt-10 flex gap-10"><Stat label="Agents" value={29} /><Stat label="Skins" value={1405} /></div>
        </RevealGroup>
      </Container>
    </section>
  );
}
