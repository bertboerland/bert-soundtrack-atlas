import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { Obsession } from "@/lib/spotify/types";

/**
 * Vertical "spikes" — songs that took over a single week.
 * Each spike's height encodes how many times the track was played
 * inside its peak 7-day window.
 */
export function ObsessionTracker({ obsessions }: { obsessions: Obsession[] }) {
  if (!obsessions.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No obsessions detected — everything in moderation.
      </div>
    );
  }

  const top = obsessions.slice(0, 24);
  const maxPlays = Math.max(...top.map((o) => o.plays));
  const sorted = [...top].sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return (
    <div className="p-6">
      {/* Spike chart */}
      <div className="relative h-64 w-full overflow-hidden rounded-lg border border-white/5 bg-black/30">
        {/* baseline */}
        <div className="absolute inset-x-0 bottom-8 h-px bg-white/10" />
        {/* horizontal grid */}
        {[0.25, 0.5, 0.75].map((p) => (
          <div
            key={p}
            className="absolute inset-x-0 h-px bg-white/[0.04]"
            style={{ bottom: `${32 + p * (256 - 64)}px` }}
          />
        ))}

        <div className="flex h-full items-end gap-1.5 px-4 pb-8 pt-4">
          {sorted.map((o, i) => {
            const h = (o.plays / maxPlays) * (256 - 64);
            return (
              <motion.div
                key={`${o.trackId}-${o.weekStart}`}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: `${h}px`, transformOrigin: "bottom" }}
                className="group relative flex-1 cursor-pointer"
              >
                <div className="absolute inset-x-0 bottom-0 h-full rounded-t-sm bg-gradient-to-t from-primary/80 via-primary/60 to-primary/20 shadow-[0_0_12px_rgba(29,185,84,0.4)] transition group-hover:from-primary group-hover:to-primary/40" />
                {/* tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/90 px-3 py-2 text-xs shadow-xl group-hover:block">
                  <div className="font-medium text-foreground">{o.name}</div>
                  <div className="text-muted-foreground">{o.artist}</div>
                  <div className="mt-1 font-mono text-[10px] text-primary">
                    {o.plays}× · week of {o.weekStart}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* axis labels */}
        <div className="absolute inset-x-4 bottom-2 flex justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>{sorted[0]?.weekStart.slice(0, 7)}</span>
          <span>{sorted[sorted.length - 1]?.weekStart.slice(0, 7)}</span>
        </div>
      </div>

      {/* Top 5 list */}
      <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {obsessions.slice(0, 6).map((o, i) => (
          <motion.div
            key={`${o.trackId}-${o.weekStart}-row`}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
            className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <Flame className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {o.name}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {o.artist}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-primary">{o.plays}×</div>
              <div className="text-[10px] text-muted-foreground">{o.weekStart}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
