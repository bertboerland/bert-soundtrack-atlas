import { useMemo, useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import type { GenreYearPoint } from "@/lib/spotify/types";
import { colorForGenre } from "@/lib/spotify/genreColors";

interface Props {
  data: GenreYearPoint[];
}

export function GenreStreamgraph({ data }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(900);
  const height = 320;
  const [hoverGenre, setHoverGenre] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(ref.current.parentElement!);
    return () => ro.disconnect();
  }, []);

  const { paths, years, genres } = useMemo(() => {
    const years = Array.from(new Set(data.map((d) => d.year))).sort();
    const genres = Array.from(new Set(data.map((d) => d.genre)));
    const matrix = years.map((year) => {
      const row: Record<string, number> & { year: number } = { year } as never;
      for (const g of genres) {
        row[g] =
          data.find((d) => d.year === year && d.genre === g)?.minutes ?? 0;
      }
      return row;
    });

    const stack = d3
      .stack<Record<string, number> & { year: number }>()
      .keys(genres)
      .offset(d3.stackOffsetWiggle)
      .order(d3.stackOrderInsideOut);
    const series = stack(matrix);

    const x = d3
      .scaleLinear()
      .domain(d3.extent(years) as [number, number])
      .range([20, width - 20]);
    const y = d3
      .scaleLinear()
      .domain([
        d3.min(series, (s) => d3.min(s, (d) => d[0])) ?? 0,
        d3.max(series, (s) => d3.max(s, (d) => d[1])) ?? 0,
      ])
      .range([height - 20, 20]);

    const area = d3
      .area<d3.SeriesPoint<Record<string, number> & { year: number }>>()
      .x((d) => x(d.data.year))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveBasis);

    const paths = series.map((s) => ({
      genre: s.key,
      d: area(s) ?? "",
      color: colorForGenre(s.key),
    }));

    return { paths, years, genres };
  }, [data, width]);

  return (
    <div className="px-4 pb-6">
      <svg ref={ref} width={width} height={height} className="block">
        <defs>
          {paths.map((p) => (
            <linearGradient key={p.genre} id={`gs-${slug(p.genre)}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={p.color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0.35" />
            </linearGradient>
          ))}
        </defs>
        {paths.map((p) => (
          <path
            key={p.genre}
            d={p.d}
            fill={`url(#gs-${slug(p.genre)})`}
            opacity={hoverGenre === null || hoverGenre === p.genre ? 1 : 0.18}
            style={{ transition: "opacity 300ms ease" }}
            onMouseEnter={() => setHoverGenre(p.genre)}
            onMouseLeave={() => setHoverGenre(null)}
          />
        ))}
        {/* Year axis */}
        {years.map((yr) => (
          <text
            key={yr}
            x={20 + ((width - 40) * (yr - years[0])) / (years[years.length - 1] - years[0])}
            y={height - 4}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            {yr}
          </text>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2 px-2">
        {paths.map((p) => (
          <button
            key={p.genre}
            onMouseEnter={() => setHoverGenre(p.genre)}
            onMouseLeave={() => setHoverGenre(null)}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: `hsl(${p.hue} 70% 55%)` }}
            />
            {p.genre}
          </button>
        ))}
      </div>
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
