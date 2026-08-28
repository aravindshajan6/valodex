import { cn } from "@/lib/cn";

/** Chamfered dark panel; the base surface for cards, stat blocks and tool UI. */
export function Panel({ className, children, interactive = false }: { className?: string; children: React.ReactNode; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "chamfer relative bg-ink-3 border border-line",
        interactive && "transition-[transform,border-color,box-shadow] duration-300 ease-out-expo hover:-translate-y-1 hover:border-red/60 hover:shadow-[0_20px_60px_-20px_rgba(255,70,85,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
