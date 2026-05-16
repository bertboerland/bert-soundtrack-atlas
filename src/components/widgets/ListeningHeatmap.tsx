import { useMemo, useState } from "react";
import type { HeatmapCell } from "@/lib/spotify/types";

interface Props {
  cells: HeatmapCell[];
}

/**
 * 24-hour x ~52-week grid for one calendar year.
 * Cell color intensity = minutes listened.
 */
export function ListeningHeatmap({ cells }: Props) {
  const [hover, setHover] = useState<HeatmapCell | null>(null);
  const grid = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const c of cells) map.set(`${c.date}|${c.hour}`, c);
    return map;
  }, [cells]);

  const year = cells[0]?.date.slice(0, 4) ?? "2024";
  const days: Date[] = useMemo(() => {
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const list: Date[] = [];
    for (let i = 0; i < 366; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      if (d.getUTCFullYear() === Number(year)) list.push(d);
    }
    return list;
  }, [year]);

  const max = useMemo(() => Math.max(1, ...cells.map((c) => c.minutes)), [cells]);

  const cellW = 4;
  const cellH = 10;
  const gap = 1;
  const width = days.length * (cellW + gap) + 40;
  const height = 24 * (cellH + gap) + 32;

  return (
    <div className="relative px-4 pb-6 pt-2">
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block">
          {/* Hour labels */}
          {Array.from({ length: 24 }).map((_, h) => (
            <text
              key={h}
              x={4}
              y={20 + h * (cellH + gap) + cellH * 0.75}
              className="fill-muted-foreground"
              style={{ fontSize: 8, fontFamily: "var(--font-mono)" }}
            >
              {String(h).padStart(2, "0")}
            </text>
          ))}
          {days.map((d, di) => {
            const dateStr = d.toISOString().slice(0, 10);
            return (
              <g key={di} transform={`translate(${30 + di * (cellW + gap)}, 20)`}>
                {Array.from({ length: 24 }).map((_, h) => {
                  const cell = grid.get(`${dateStr}|${h}`);
                  const intensity = cell ? cell.minutes / max : 0;
                  return (
                    <rect
                      key={h}
                      x={0}
                      y={h * (cellH + gap)}
                      width={cellW}
                      height={cellH}
                      rx={1}
                      fill={
                        intensity === 0
                          ? "rgba(255,255,255,0.04)"
                          : `rgba(29, 185, 84, ${0.18 + intensity * 0.82})`
                      }
                      onMouseEnter={() =>
                        cell && setHover(cell)
                      }
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      {hover && (
        <div className="pointer-events-none absolute right-4 top-2 rounded-lg border border-white/10 bg-background/90 px-3 py-2 text-xs backdrop-blur">
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
            {hover.date} · {String(hover.hour).padStart(2, "0")}:00
          </div>
          <div className="mt-0.5 text-foreground">{hover.minutes} min listened</div>
        </div>
      )}
      <p className="mt-3 px-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {year} · hourly listening intensity
      </p>
    </div>
  );
}
