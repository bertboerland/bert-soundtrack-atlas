import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useDataset } from "@/lib/spotify/useDataset";
import { Topbar } from "@/components/dashboard/Topbar";
import { HeroWidget } from "@/components/widgets/HeroWidget";
import { MusicGalaxy3D } from "@/components/widgets/MusicGalaxy3D";
import { GenreStreamgraph } from "@/components/widgets/GenreStreamgraph";
import { ListeningHeatmap } from "@/components/widgets/ListeningHeatmap";
import { InsightsEngine } from "@/components/widgets/InsightsEngine";
import { NowPlayingMemory } from "@/components/widgets/NowPlayingMemory";
import { ObsessionTracker } from "@/components/widgets/ObsessionTracker";
import { ClientTimeline } from "@/components/widgets/ClientTimeline";
import { WidgetCard } from "@/components/widgets/WidgetCard";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "The Soundtrack of Bert — A living map of years, obsessions and sonic memories" },
      {
        name: "description",
        content:
          "An interactive musical autobiography of Bert Boerland: thousands of Spotify streams visualized as a 3D galaxy, genre evolution, listening rituals and obsessions.",
      },
      { property: "og:title", content: "The Soundtrack of Bert" },
      {
        property: "og:description",
        content: "A living map of years, obsessions, rhythms and sonic memories.",
      },
      { property: "og:image", content: "/og-image.jpg" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "The Soundtrack of Bert" },
      {
        name: "twitter:description",
        content: "A living map of years, obsessions, rhythms and sonic memories.",
      },
      { name: "twitter:image", content: "/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

function Dashboard() {
  const { data, source } = useDataset();
  const [year, setYear] = useState<number | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!data) return null;
    let tracks = data.topTracks;
    if (year !== "all") tracks = tracks.filter((t) => t.yearsActive.includes(year));
    if (query.trim()) {
      const q = query.toLowerCase();
      tracks = tracks.filter(
        (t) => t.name.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
      );
    }
    return { ...data, topTracks: tracks };
  }, [data, year, query]);

  if (!data || !filtered) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Tuning instruments…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <Topbar
        yearRange={data.meta.yearRange}
        year={year}
        onYearChange={setYear}
        query={query}
        onQueryChange={setQuery}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Hero */}
        <HeroWidget data={filtered} source={source} />

        {/* 3D Galaxy — full width */}
        <WidgetCard
          title="Music Galaxy"
          subtitle="3D constellation of every track"
          description="Each star is a song, sized by total play-time, coloured by genre, and connected by faint lines to other tracks by the same artist. Drag to orbit, scroll to zoom, hover to hear a 30-second preview."
          delay={0.05}
        >
          <MusicGalaxy3D
            nodes={data.galaxyNodes}
            trackGenres={Object.fromEntries(data.topTracks.map((t) => [t.trackId, t.genre]))}
            artistGenres={Object.fromEntries(data.topArtists.map((a) => [a.artist, a.topGenre]))}
          />
        </WidgetCard>

        {/* Streamgraph */}
        <WidgetCard
          title="Genre Evolution"
          subtitle="How taste shifted across the years"
          delay={0.1}
        >
          <GenreStreamgraph data={data.genreEvolution} />
        </WidgetCard>

        {/* Heatmap */}
        <WidgetCard
          title="Listening Heatmap"
          subtitle="Every day, every year — colored by the dominant genre of that year"
          delay={0.15}
        >
          <ListeningHeatmap cells={data.heatmap} genreEvolution={data.genreEvolution} />
        </WidgetCard>

        {/* Obsessions */}
        <WidgetCard
          title="Obsession Tracker"
          subtitle="Tracks that took over a single week"
          delay={0.18}
        >
          <ObsessionTracker obsessions={data.obsessions} topTracks={data.topTracks} />
        </WidgetCard>

        {/* Clients over time */}
        <WidgetCard
          title="Devices Through Time"
          subtitle="How the listening surface shifted, month by month"
          delay={0.2}
        >
          <ClientTimeline data={data.clientTimeline} />
        </WidgetCard>

        {/* Insights */}
        <WidgetCard
          title="Insights Engine"
          subtitle="Patterns the data noticed before you did"
          delay={0.22}
        >
          <InsightsEngine insights={data.insights} />
        </WidgetCard>

        {/* Footer credit */}
        <footer className="px-2 pt-8 text-center text-xs text-muted-foreground">
          Built with React, D3, Three.js &amp; Framer Motion ·{" "}
          {data.meta.totalStreams.toLocaleString()} streams analysed · self-hostable,
          open-source on{" "}
          <a
            href="https://github.com/bertboerland/bert-soundtrack-atlas"
            target="_blank"
            rel="noreferrer"
            className="story-link text-primary/90 hover:text-primary"
          >
            GitHub
          </a>
          .
        </footer>
      </main>

      <NowPlayingMemory tracks={data.topTracks} />
    </div>
  );
}
