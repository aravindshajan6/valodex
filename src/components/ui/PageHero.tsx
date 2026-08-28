import { Container } from "./Container";
import { SectionHeading } from "./SectionHeading";
import { RevealGroup } from "@/components/motion/RevealGroup";

/** Standard top-of-page hero for list pages. Pass `media` for a full-bleed background (image or 3D). */
export function PageHero({
  eyebrow,
  title,
  description,
  media,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  media?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24">
      {media && <div className="absolute inset-0 -z-10">{media}<div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" /></div>}
      {!media && <div className="bg-grid absolute inset-0 -z-10 opacity-60" />}
      <Container>
        <RevealGroup>
          <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={description} />
          {children && <div className="mt-8">{children}</div>}
        </RevealGroup>
      </Container>
    </section>
  );
}
