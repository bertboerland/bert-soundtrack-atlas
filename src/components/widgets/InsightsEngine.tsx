import { motion } from "framer-motion";
import { Sparkles, Repeat, Compass, TrendingUp } from "lucide-react";
import type { Insight } from "@/lib/spotify/types";

const ICONS = {
  discovery: Compass,
  ritual: Repeat,
  obsession: Sparkles,
  evolution: TrendingUp,
};

export function InsightsEngine({ insights }: { insights: Insight[] }) {
  return (
    <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
      {insights.map((it, i) => {
        const Icon = ICONS[it.tone];
        return (
          <motion.article
            key={it.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.06 }}
            className="group relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition hover:border-primary/30"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/25" />
            <div className="relative flex items-start gap-3">
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {it.tone}
                  </span>
                  {it.metric && (
                    <span className="font-mono text-sm font-medium text-primary">
                      {it.metric}
                    </span>
                  )}
                </div>
                <h4 className="mt-1.5 font-display text-base font-medium leading-snug text-foreground">
                  {it.headline}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {it.body}
                </p>
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
