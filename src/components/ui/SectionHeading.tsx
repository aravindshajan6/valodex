import { cn } from "@/lib/cn";

/** Big Anton display heading with a small mono eyebrow — the standard section opener. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow && (
        <div data-reveal className="mb-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-red">
          <span className="h-px w-8 bg-red" />
          {eyebrow}
        </div>
      )}
      <Tag data-reveal className="display text-5xl sm:text-6xl lg:text-7xl text-bone">{title}</Tag>
      {description && <p data-reveal className="mt-4 text-base sm:text-lg text-bone-2 leading-relaxed">{description}</p>}
    </div>
  );
}
