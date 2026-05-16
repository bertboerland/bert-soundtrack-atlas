import { useMemo, useState } from "react";
import type { HeatmapCell, GenreYearPoint } from "@/lib/spotify/types";
import { colorForGenre } from "@/lib/spotify/genreColors";

interface Props {
  cells: HeatmapCell[];
  genreEvolution?: GenreYearPoint[];
}

/**
 * Multi-year overview heatmap.
 *   rows    = calendar years (descending: most recent at top)
 *   columns = days of the year (Jan 1 … Dec 31)
 *   color   = total minutes listened that day
 *
 * Surfaces how continuous the listening habit has been over time.
 */
export function ListeningHeatmap({ cells }: Props) {
  const [hover, setHover] = useState<{
    date: string;
    minutes: number;
    x: number;
    y: number;
  } | null>(null);

  // Aggregate hourly cells → daily minutes
  const { byYear, years, max, totalDays, activeDays, longestStreak } = useMemo(() => {
    const dayMap = new Map<string, number>(); // YYYY-MM-DD → minutes
    for (const c of cells) {
      dayMap.set(c.date, (dayMap.get(c.date) ?? 0) + c.minutes);
    }
    const years = Array.from(
      new Set([...dayMap.keys()].map((d) => Number(d.slice(0, 4)))),
    ).sort((a, b) => b - a);

    const byYear = new Map<number, Map<number, number>>(); // year → dayIndex(0..365) → minutes
    for (const y of years) byYear.set(y, new Map());
    for (const [date, minutes] of dayMap) {
      const y = Number(date.slice(0, 4));
      const start = Date.UTC(y, 0, 1);
      const d = Date.UTC(
        Number(date.slice(0, 4)),
        Number(date.slice(5, 7)) - 1,
        Number(date.slice(8, 10)),
      );
      const idx = Math.round((d - start) / 86400000);
      byYear.get(y)!.set(idx, minutes);
    }

    const max = Math.max(1, ...dayMap.values());

    // Compute coverage stats across the full span
    const allDates = [...dayMap.keys()].sort();
    const first = allDates[0];
    const last = allDates[allDates.length - 1];
    let totalDays = 0;
    if (first && last) {
      const f = Date.UTC(+first.slice(0, 4), +first.slice(5, 7) - 1, +first.slice(8, 10));
      const l = Date.UTC(+last.slice(0, 4), +last.slice(5, 7) - 1, +last.slice(8, 10));
      totalDays = Math.round((l - f) / 86400000) + 1;
    }
    const activeDays = dayMap.size;

    // Longest consecutive-day streak
    const dateSet = new Set(dayMap.keys());
    let longestStreak = 0;
    let cur = 0;
    if (first && last) {
      const f = Date.UTC(+first.slice(0, 4), +first.slice(5, 7) - 1, +first.slice(8, 10));
      for (let i = 0; i < totalDays; i++) {
        const dt = new Date(f + i * 86400000).toISOString().slice(0, 10);
        if (dateSet.has(dt)) {
          cur++;
          if (cur > longestStreak) longestStreak = cur;
        } else cur = 0;
      }
    }

    return { byYear, years, max, totalDays, activeDays, longestStreak };
  }, [cells]);

  const cellSize = 9;
  const gap = 2;
  const rowH = cellSize + gap;
  const labelW = 40;
  const days = 366;
  const width = labelW + days * (cellSize + gap) + 16;
  const height = years.length * rowH + 48;

  // Month tick positions (cumulative day-of-year for the 1st of each month, non-leap)
  const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const coveragePct = totalDays ? Math.round((activeDays / totalDays) * 100) : 0;

  return (
    <div className="relative px-4 pb-6 pt-2">
      {/* Headline stats — the "I always listen" story */}
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
        <div>
          <span className="font-mono text-2xl text-primary">{coveragePct}%</span>
          <span className="ml-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            of all days, listening
          </span>
        </div>
        <div>
          <span className="font-mono text-lg text-foreground">
            {activeDays.toLocaleString()}
          </span>
          <span className="ml-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            / {totalDays.toLocaleString()} days
          </span>
        </div>
        <div>
          <span className="font-mono text-lg text-foreground">
            {longestStreak}
          </span>
          <span className="ml-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            day streak
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block">
          {/* Month labels along the top */}
          {monthStarts.map((start, i) => (
            <text
              key={i}
              x={labelW + start * (cellSize + gap)}
              y={14}
              className="fill-muted-foreground"
              style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}
            >
              {monthLabels[i]}
            </text>
          ))}

          {years.map((y, rowIdx) => {
            const row = byYear.get(y)!;
            const yTop = 24 + rowIdx * rowH;
            return (
              <g key={y}>
                <text
                  x={labelW - 6}
                  y={yTop + cellSize * 0.85}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                >
                  {y}
                </text>
                {Array.from({ length: days }).map((_, di) => {
                  const minutes = row.get(di) ?? 0;
                  const intensity = minutes / max;
                  const fill =
                    minutes === 0
                      ? "rgba(255,255,255,0.035)"
                      : `rgba(29, 185, 84, ${0.22 + Math.sqrt(intensity) * 0.78})`;
                  // Reconstruct date for tooltip
                  const dt = new Date(Date.UTC(y, 0, 1) + di * 86400000);
                  if (dt.getUTCFullYear() !== y) return null;
                  const dateStr = dt.toISOString().slice(0, 10);
                  return (
                    <rect
                      key={di}
                      x={labelW + di * (cellSize + gap)}
                      y={yTop}
                      width={cellSize}
                      height={cellSize}
                      rx={1.5}
                      fill={fill}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                        setHover({
                          date: dateStr,
                          minutes: Math.round(minutes),
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>less</span>
        {[0.05, 0.2, 0.4, 0.65, 0.95].map((i, idx) => (
          <span
            key={idx}
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{
              background:
                i < 0.1
                  ? "rgba(255,255,255,0.035)"
                  : `rgba(29, 185, 84, ${0.22 + Math.sqrt(i) * 0.78})`,
            }}
          />
        ))}
        <span>more</span>
        <span className="ml-auto">
          {years[years.length - 1]} → {years[0]} · daily minutes
        </span>
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute rounded-lg border border-white/10 bg-background/95 px-3 py-2 text-xs backdrop-blur"
          style={{ left: Math.min(hover.x + 12, 600), top: hover.y + 12 }}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
            {hover.date}
          </div>
          <div className="mt-0.5 text-foreground">
            {hover.minutes > 0 ? `${hover.minutes} min listened` : "silent day"}
          </div>
        </div>
      )}
    </div>
  );
}
