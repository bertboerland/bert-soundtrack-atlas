import { useMemo, useState } from "react";
import type { HeatmapCell, GenreYearPoint } from "@/lib/spotify/types";
import { colorForGenre } from "@/lib/spotify/genreColors";

interface Props {
  cells: HeatmapCell[];
  genreEvolution?: GenreYearPoint[];
}

/**
 * Chronological listening heatmap — one continuous horizontal flow from the
 * very first listening day to the most recent. Each column is one week,
 * colored by the dominant genre of that calendar year (matching the
 * Genre Evolution palette) with intensity scaled by minutes listened.
 *
 * Reads left→right like a timeline, so the eye naturally tracks taste
 * shifts the same way it does in the streamgraph above.
 */
export function ListeningHeatmap({ cells, genreEvolution = [] }: Props) {
  const [hover, setHover] = useState<{
    label: string;
    minutes: number;
    x: number;
    y: number;
  } | null>(null);

  const {
    weeks,
    maxWeekMinutes,
    yearMarkers,
    totalDays,
    activeDays,
    longestStreak,
  } = useMemo(() => {
    // Daily aggregation
    const dayMap = new Map<string, number>();
    for (const c of cells) {
      dayMap.set(c.date, (dayMap.get(c.date) ?? 0) + c.minutes);
    }
    const allDates = [...dayMap.keys()].sort();
    if (allDates.length === 0) {
      return {
        weeks: [] as { weekStart: string; year: number; minutes: number }[],
        maxWeekMinutes: 1,
        yearMarkers: [] as { year: number; index: number }[],
        totalDays: 0,
        activeDays: 0,
        longestStreak: 0,
      };
    }
    const first = allDates[0];
    const last = allDates[allDates.length - 1];

    const toUTC = (s: string) =>
      Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    const fUTC = toUTC(first);
    const lUTC = toUTC(last);
    const totalDays = Math.round((lUTC - fUTC) / 86400000) + 1;

    // Streak
    const dateSet = new Set(dayMap.keys());
    let longestStreak = 0;
    let cur = 0;
    for (let i = 0; i < totalDays; i++) {
      const dt = new Date(fUTC + i * 86400000).toISOString().slice(0, 10);
      if (dateSet.has(dt)) {
        cur++;
        if (cur > longestStreak) longestStreak = cur;
      } else cur = 0;
    }

    // Snap start to the prior Monday so week columns are aligned
    const firstDate = new Date(fUTC);
    const dow = (firstDate.getUTCDay() + 6) % 7; // Mon=0
    const weekStartUTC = fUTC - dow * 86400000;
    const totalWeeks = Math.ceil((lUTC - weekStartUTC) / (7 * 86400000)) + 1;

    const weeks: { weekStart: string; year: number; minutes: number }[] = [];
    let maxWeekMinutes = 1;
    const yearMarkers: { year: number; index: number }[] = [];
    let lastMarkedYear = -1;

    for (let w = 0; w < totalWeeks; w++) {
      const startMs = weekStartUTC + w * 7 * 86400000;
      let minutes = 0;
      for (let d = 0; d < 7; d++) {
        const dt = new Date(startMs + d * 86400000).toISOString().slice(0, 10);
        minutes += dayMap.get(dt) ?? 0;
      }
      const startStr = new Date(startMs).toISOString().slice(0, 10);
      const year = Number(startStr.slice(0, 4));
      weeks.push({ weekStart: startStr, year, minutes });
      if (minutes > maxWeekMinutes) maxWeekMinutes = minutes;
      if (year !== lastMarkedYear) {
        yearMarkers.push({ year, index: w });
        lastMarkedYear = year;
      }
    }

    return {
      weeks,
      maxWeekMinutes,
      yearMarkers,
      totalDays,
      activeDays: dayMap.size,
      longestStreak,
    };
  }, [cells]);

  // Year → dominant genre/color (matches streamgraph)
  const yearGenre = useMemo(() => {
    const m = new Map<number, { genre: string; color: string }>();
    const byYear = new Map<number, Map<string, number>>();
    for (const p of genreEvolution) {
      if (!byYear.has(p.year)) byYear.set(p.year, new Map());
      const g = byYear.get(p.year)!;
      g.set(p.genre, (g.get(p.genre) ?? 0) + p.minutes);
    }
    for (const [yr, g] of byYear) {
      const top = [...g.entries()].sort((a, b) => b[1] - a[1])[0];
      const genre = top?.[0] ?? "Unknown";
      m.set(yr, { genre, color: colorForGenre(genre) });
    }
    return m;
  }, [genreEvolution]);

  function withAlpha(color: string, alpha: number): string {
    if (color.startsWith("#")) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith("hsl(")) {
      return color.replace("hsl(", "hsla(").replace(")", ` / ${alpha})`);
    }
    return color;
  }

  const colW = 6;
  const gap = 1;
  const rowH = 56;
  const padY = 28;
  const padBottom = 40;
  const width = Math.max(600, weeks.length * (colW + gap) + 20);
  const height = rowH + padY + padBottom;

  const coveragePct = totalDays ? Math.round((activeDays / totalDays) * 100) : 0;

  return (
    <div className="relative px-4 pb-6 pt-2">
      {/* Headline stats */}
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
          <span className="font-mono text-lg text-foreground">{longestStreak}</span>
          <span className="ml-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            day streak
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block">
          {/* Year labels along the top */}
          {yearMarkers.map(({ year, index }) => {
            const x = index * (colW + gap);
            const yc = yearGenre.get(year);
            return (
              <g key={year}>
                <line
                  x1={x}
                  x2={x}
                  y1={padY - 6}
                  y2={padY + rowH + 2}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                />
                <text
                  x={x + 3}
                  y={padY - 8}
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    fill: yc?.color ?? "#94a3b8",
                  }}
                >
                  {year}
                </text>
              </g>
            );
          })}

          {/* Week cells */}
          {weeks.map((w, i) => {
            const yc = yearGenre.get(w.year);
            const base = yc?.color ?? "#1DB954";
            const intensity = w.minutes / maxWeekMinutes;
            const fill =
              w.minutes === 0
                ? "rgba(255,255,255,0.035)"
                : withAlpha(base, 0.22 + Math.sqrt(intensity) * 0.78);
            return (
              <rect
                key={i}
                x={i * (colW + gap)}
                y={padY}
                width={colW}
                height={rowH}
                rx={1.5}
                fill={fill}
                onMouseEnter={(e) => {
                  const svgRect = (
                    e.currentTarget.ownerSVGElement as SVGSVGElement
                  ).getBoundingClientRect();
                  setHover({
                    label: `week of ${w.weekStart}`,
                    minutes: Math.round(w.minutes),
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                  });
                }}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
      </div>

      {/* Per-year genre legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {[...yearGenre.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([yr, { genre, color }]) => (
            <span key={yr} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[2px]"
                style={{ background: color }}
              />
              <span className="font-mono" style={{ color }}>
                {yr}
              </span>
              <span className="opacity-60">{genre}</span>
            </span>
          ))}
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute rounded-lg border border-white/10 bg-background/95 px-3 py-2 text-xs backdrop-blur"
          style={{ left: Math.min(hover.x + 12, 600), top: hover.y + 12 }}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
            {hover.label}
          </div>
          <div className="mt-0.5 text-foreground">
            {hover.minutes > 0 ? `${hover.minutes} min listened` : "silent week"}
          </div>
        </div>
      )}
    </div>
  );
}
