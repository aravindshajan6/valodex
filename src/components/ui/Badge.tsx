import { cn } from "@/lib/cn";

type Tone = "neutral" | "red" | "holo" | "gold";
const tones: Record<Tone, string> = {
  neutral: "border-line text-bone-2",
  red: "border-red/50 text-red",
  holo: "border-holo/50 text-holo",
  gold: "border-gold/50 text-gold",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em]", tones[tone], className)}>
      {children}
    </span>
  );
}
