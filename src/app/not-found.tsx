import Link from "next/link";
import { Container } from "@/components/ui";
import { RevealGroup, Magnetic } from "@/components/motion";

export default function NotFound() {
  return (
    <section className="relative min-h-dvh flex items-center overflow-hidden">
      <div className="bg-grid absolute inset-0 -z-10 opacity-60" />
      <Container>
        <RevealGroup>
          <div data-reveal className="font-mono text-[11px] uppercase tracking-[0.3em] text-red">Error 404 · Spike not found</div>
          <h1 data-reveal className="display mt-4 text-[22vw] leading-none sm:text-[12rem] text-bone">Lost</h1>
          <p data-reveal className="mt-4 max-w-md text-bone-2">That page isn&apos;t on any map we know. Rotate back to site.</p>
          <div data-reveal className="mt-10">
            <Magnetic className="inline-block">
              <Link href="/" className="chamfer-sm inline-flex items-center gap-3 bg-red px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-bone hover:bg-red-2 transition-colors">
                Back to base
              </Link>
            </Magnetic>
          </div>
        </RevealGroup>
      </Container>
    </section>
  );
}
