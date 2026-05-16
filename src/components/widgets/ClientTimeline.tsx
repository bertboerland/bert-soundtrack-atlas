import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ClientTimelinePoint } from "@/lib/spotify/types";

/**
 * Stacked area / bar of listening minutes per platform per month.
 * Shows how Bert's listening surface shifted: iPhones → Macs → Cast speakers.
 */
const PLATFORM_COLORS: Record<string, string> = {
  iOS: "hsl(141 76% 48%)",          // spotify green
  macOS: "hsl(200 90% 60%)",         // cyan
  "Cast / Speaker": "hsl(280 80% 65%)", // violet
  Android: "hsl(35 95% 60%)",        // amber
  Windows: "hsl(0 80% 65%)",         // red
  Linux: "hsl(50 95% 60%)",          // yellow
  Web: "hsl(320 75% 65%)",           // pink
  Other: "hsl(220 10% 50%)",         // gray
  Unknown: "hsl(220 10% 35%)",
};

export function ClientTimeline({ data }: { data: ClientTimelinePoint[] }) {
  const { months, platforms, totals, max } = useMemo(() => {
    const monthSet = new Set<string>();
    const platformSet = new Set<string>();
    for (const d of data) {
      monthSet.add(d.month);
      platformSet.add(d.platform);
    }
    const months = [...monthSet].sort();
    // order platforms by total minutes desc
    const platformTotal = new Map<string, number>();
    for (const d of data) {
      platformTotal.set(d.platform, (platformTotal.get(d.platform) ?? 0) + d.minutes);
    }
    const platforms = [...platformSet].sort(
      (a, b) => (platformTotal.get(b) ?? 0) - (platformTotal.get(a) ?? 0),
    );

    // matrix [month][platform]
    const byKey = new Map<string, number>();
    for (const d of data) byKey.set(`${d.month}|${d.platform}`, d.minutes);

    const totals: { month: string; segments: { platform: string; minutes: number }[]; total: number }[] = months.map((m) => {
      const segments = platforms.map((p) => ({
        platform: p,
        minutes: byKey.get(`${m}|${p}`) ?? 0,
      }));
      const total = segments.reduce((a, s) => a + s.minutes, 0);
      return { month: m, segments, total };
    });
    const max = Math.max(1, ...totals.map((t) => t.total));
    return { months, platforms, totals, max };
  }, [data]);

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No client data available.
      </div>
    );
  }

  const grandTotal = totals.reduce((a, t) => a + t.total, 0);
  const platformShare = platforms.map((p) => {
    const sum = totals.reduce(
      (a, t) => a + (t.segments.find((s) => s.platform === p)?.minutes ?? 0),
      0,
    );
    return { platform: p, minutes: sum, pct: (sum / grandTotal) * 100 };
  });

  return (
    <div className="p-6">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
        {platformShare.map((p) => (
          <div key={p.platform} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: PLATFORM_COLORS[p.platform] ?? PLATFORM_COLORS.Other }}
            />
            <span className="text-foreground">{p.platform}</span>
            <span className="font-mono text-muted-foreground">{p.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Stacked bars */}
      <div className="relative h-56 w-full overflow-hidden rounded-lg border border-white/5 bg-black/30">
        <div className="flex h-full items-end gap-px px-3 pb-6 pt-3">
          {totals.map((t, i) => {
            const totalHeight = (t.total / max) * (224 - 36);
            return (
              <motion.div
                key={t.month}
                initial={{ opacity: 0, scaleY: 0 }}
                whileInView={{ opacity: 1, scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.005, 0.6) }}
                style={{ height: `${totalHeight}px`, transformOrigin: "bottom" }}
                className="group relative flex flex-1 flex-col-reverse overflow-hidden rounded-t-sm"
                title={`${t.month} · ${Math.round(t.total).toLocaleString()} min`}
              >
                {t.segments.map((s) => {
                  if (s.minutes === 0) return null;
                  const h = (s.minutes / t.total) * 100;
                  return (
                    <div
                      key={s.platform}
                      style={{
                        height: `${h}%`,
                        background: PLATFORM_COLORS[s.platform] ?? PLATFORM_COLORS.Other,
                      }}
                    />
                  );
                })}
                {/* tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/90 px-3 py-2 text-[11px] shadow-xl group-hover:block">
                  <div className="font-mono text-foreground">{t.month}</div>
                  <div className="text-muted-foreground">
                    {Math.round(t.total).toLocaleString()} min total
                  </div>
                  {t.segments
                    .filter((s) => s.minutes > 0)
                    .sort((a, b) => b.minutes - a.minutes)
                    .slice(0, 4)
                    .map((s) => (
                      <div key={s.platform} className="flex justify-between gap-3">
                        <span style={{ color: PLATFORM_COLORS[s.platform] }}>{s.platform}</span>
                        <span className="font-mono text-muted-foreground">
                          {Math.round((s.minutes / t.total) * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* x-axis ticks: first / mid / last */}
        <div className="absolute inset-x-3 bottom-1 flex justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>{months[0]}</span>
          <span>{months[Math.floor(months.length / 2)]}</span>
          <span>{months[months.length - 1]}</span>
        </div>
      </div>
    </div>
  );
}
