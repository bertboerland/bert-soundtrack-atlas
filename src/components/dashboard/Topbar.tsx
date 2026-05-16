import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";

interface TopbarProps {
  yearRange: [number, number];
  year: number | "all";
  onYearChange: (y: number | "all") => void;
  query: string;
  onQueryChange: (q: string) => void;
}

export function Topbar({ yearRange, year, onYearChange, query, onQueryChange }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const years: Array<number | "all"> = [
    "all",
    ...Array.from(
      { length: yearRange[1] - yearRange[0] + 1 },
      (_, i) => yearRange[1] - i,
    ),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 backdrop-blur-xl">
      <div className="absolute inset-0 bg-background/70" />
      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="block h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--spotify)] animate-pulse-glow" />
          <span className="font-display text-sm font-semibold tracking-tight text-foreground">
            Soundtrack of Bert
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            / dashboard
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search tracks, artists…"
              className="w-56 rounded-full border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground transition hover:border-primary/40"
            >
              {year === "all" ? "All years" : year}
              <ChevronDown className="h-3 w-3" />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-background/95 py-1 backdrop-blur">
                {years.map((y) => (
                  <button
                    key={String(y)}
                    onClick={() => {
                      onYearChange(y);
                      setOpen(false);
                    }}
                    className={`block w-full px-4 py-1.5 text-left text-xs transition hover:bg-primary/10 ${
                      y === year ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {y === "all" ? "All years" : y}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
