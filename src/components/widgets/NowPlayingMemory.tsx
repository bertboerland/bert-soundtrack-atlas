import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Disc3 } from "lucide-react";
import type { TrackAggregate } from "@/lib/spotify/types";
import { usePreviewAudio } from "@/lib/spotify/usePreviewAudio";

interface Props {
  tracks: TrackAggregate[];
}

/**
 * Sticky footer "On this day in <year> Bert listened to ..."
 * Cycles through memorable tracks every few seconds.
 * Hovering plays a 30-second preview (lingers ~10s after the cursor leaves).
 */
export function NowPlayingMemory({ tracks }: Props) {
  const [index, setIndex] = useState(0);
  const memorable = tracks.slice(0, 12);
  const { play, release, state, activeKey } = usePreviewAudio();

  useEffect(() => {
    if (memorable.length === 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % memorable.length), 6000);
    return () => clearInterval(t);
  }, [memorable.length]);

  if (memorable.length === 0) return null;
  const current = memorable[index];
  const year = current.lastPlayed.slice(0, 4);
  const isActive =
    activeKey === `${current.artist}::${current.name}` && state === "playing";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-4">
      <div className="mx-auto max-w-5xl">
        <div
          className="glass-strong flex cursor-pointer items-center gap-4 rounded-full border border-white/10 px-3 py-2 transition hover:border-primary/40 sm:px-5 sm:py-3"
          onMouseEnter={() => play(current.artist, current.name)}
          onMouseLeave={() => release()}
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary/40 to-cyan-glow/30 sm:h-12 sm:w-12">
            <div className="absolute inset-0 flex items-center justify-center">
              <Disc3 className="h-6 w-6 animate-spin text-primary [animation-duration:6s]" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              On this day in {year} · Bert listened to
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={current.trackId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                className="truncate font-display text-sm font-medium text-foreground sm:text-base"
              >
                {current.name} <span className="text-muted-foreground">— {current.artist}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Equalizer bars — animate brighter while a preview is actually playing */}
          <div className="hidden items-end gap-[3px] sm:flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={`block w-[3px] rounded-sm animate-equalizer ${
                  isActive ? "bg-primary" : "bg-primary/40"
                }`}
                style={{
                  height: 18,
                  animationDelay: `${i * 120}ms`,
                  animationDuration: `${700 + i * 80}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
