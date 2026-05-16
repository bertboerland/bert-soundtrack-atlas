import { motion } from "framer-motion";
import { Linkedin, Globe, Music2 } from "lucide-react";
import type { ProcessedDataset } from "@/lib/spotify/types";

interface HeroProps {
  data: ProcessedDataset;
  source: "real" | "mock" | "loading";
}

export function HeroWidget({ data, source }: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl glass-strong">
      {/* Particle background */}
      <ParticleField />

      {/* Equalizer wave at bottom */}
      <Equalizer />

      <div className="relative z-10 px-8 py-16 sm:px-14 sm:py-20 lg:px-20 lg:py-28">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary"
        >
          <Music2 className="h-3 w-3" />
          {data.meta.yearRange[0]} → {data.meta.yearRange[1]} · An interactive memoir
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.5rem]"
        >
          The Soundtrack <br />
          of <span className="gradient-text text-glow">Bert</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
        >
          A living map of years, obsessions, rhythms and sonic memories — every track
          Bert ever pressed play on, mapped across {data.meta.yearRange[1] - data.meta.yearRange[0] + 1}{" "}
          years of listening.
        </motion.p>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          <Stat label="Minutes" value={fmt(data.meta.totalMinutes)} />
          <Stat label="Streams" value={fmt(data.meta.totalStreams)} />
          <Stat label="Tracks" value={fmt(data.meta.totalTracks)} />
          <Stat label="Artists" value={fmt(data.meta.totalArtists)} />
        </motion.div>

        {/* Bert's profile */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-display text-base font-medium text-foreground">Bert Boerland</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Open source advocate · Drupal expert · Keynote speaker · focused on
              digital sovereignty &amp; open ecosystems.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="https://www.linkedin.com/in/bertboerland/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              <Linkedin className="h-4 w-4" /> LinkedIn
            </a>
            <a
              href="https://boer.land"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              <Globe className="h-4 w-4" /> boer.land
            </a>
          </div>
        </motion.div>

        {source === "mock" && (
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60">
            ◆ Preview running on synthetic data — run <code className="font-mono text-primary/80">npm run ingest</code> to load real history.
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 backdrop-blur">
      <div className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function ParticleField() {
  // Cheap CSS particle field — lots of softly-glowing dots that drift.
  const particles = Array.from({ length: 70 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-[0.4]" />
      <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute -bottom-40 right-0 h-[400px] w-[400px] rounded-full bg-cyan-glow/10 blur-[100px]" />
      {particles.map((_, i) => {
        const top = (i * 37) % 100;
        const left = (i * 53) % 100;
        const size = 1 + ((i * 7) % 4);
        const delay = (i % 12) * 0.6;
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white/40 animate-slow-drift"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: size,
              height: size,
              animationDelay: `${delay}s`,
              boxShadow: "0 0 6px rgba(255,255,255,0.6)",
            }}
          />
        );
      })}
    </div>
  );
}

function Equalizer() {
  // Audio-waveform–style visualization: symmetric bars mirrored around a
  // center axis, with heights driven by a sum-of-sines envelope so the
  // silhouette reads as a real .wav file rather than a chart equalizer.
  const N = 160;
  const bars = useMemo(() => {
    return Array.from({ length: N }).map((_, i) => {
      const t = i / N;
      // Sum of sines + a pseudo-random micro-jitter for realism
      const envelope =
        0.55 +
        0.35 * Math.sin(t * Math.PI * 3.1) +
        0.18 * Math.sin(t * Math.PI * 11 + 1.3) +
        0.08 * Math.sin(t * Math.PI * 27 + 0.7);
      const jitter = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const amp = Math.max(0.05, Math.min(1, Math.abs(envelope) + jitter * 0.08));
      return {
        amp,
        delay: (i * 53) % 2200,
        duration: 1400 + ((i * 91) % 1200),
      };
    });
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-36 opacity-60">
      {/* Soft center-line glow */}
      <div className="absolute inset-x-0 bottom-[calc(50%-1px)] h-px bg-primary/40 shadow-[0_0_12px_rgba(29,185,84,0.5)]" />
      <div className="flex h-full items-center gap-[2px] px-2">
        {bars.map((b, i) => (
          <span
            key={i}
            className="flex-1 animate-waveform"
            style={
              {
                ["--amp" as string]: b.amp.toFixed(3),
                animationDelay: `${b.delay}ms`,
                animationDuration: `${b.duration}ms`,
              } as React.CSSProperties
            }
          >
            {/* upper half */}
            <span
              className="block w-full rounded-full bg-gradient-to-t from-primary/90 to-cyan-glow/70"
              style={{ height: `calc(50% * var(--amp))`, marginTop: `calc(50% - 50% * var(--amp))` }}
            />
            {/* lower half (mirror) */}
            <span
              className="block w-full rounded-full bg-gradient-to-b from-primary/90 to-cyan-glow/30"
              style={{ height: `calc(50% * var(--amp))` }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
