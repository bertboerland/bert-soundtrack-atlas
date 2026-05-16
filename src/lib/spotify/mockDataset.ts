import type {
  ProcessedDataset,
  TrackAggregate,
  ArtistAggregate,
  GenreYearPoint,
  HeatmapCell,
  Obsession,
  Survivor,
  Insight,
  GalaxyNode,
} from "./types";

/**
 * Deterministic mock dataset for preview when no real data has been ingested.
 * Mirrors the shape that `npm run ingest` produces from real Spotify exports.
 */

// Tiny seeded RNG so the mock is stable across renders.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(424242);

const YEARS = Array.from({ length: 17 }, (_, i) => 2010 + i); // 2010..2026
const GENRES = [
  { name: "Alternative Rock", hue: 145 },
  { name: "Indie", hue: 170 },
  { name: "Electronic", hue: 200 },
  { name: "Hip Hop", hue: 35 },
  { name: "Jazz", hue: 50 },
  { name: "Classic Rock", hue: 15 },
  { name: "Ambient", hue: 220 },
  { name: "Soul", hue: 320 },
  { name: "Folk", hue: 100 },
  { name: "Singer-Songwriter", hue: 270 },
];

const ARTISTS: Array<{ name: string; genre: string }> = [
  { name: "Junip", genre: "Indie" },
  { name: "The Doobie Brothers", genre: "Classic Rock" },
  { name: "Genesis", genre: "Classic Rock" },
  { name: "Snoop Dogg", genre: "Hip Hop" },
  { name: "Bonobo", genre: "Electronic" },
  { name: "Nils Frahm", genre: "Ambient" },
  { name: "Radiohead", genre: "Alternative Rock" },
  { name: "Khruangbin", genre: "Soul" },
  { name: "Bon Iver", genre: "Folk" },
  { name: "Sufjan Stevens", genre: "Singer-Songwriter" },
  { name: "Four Tet", genre: "Electronic" },
  { name: "Thom Yorke", genre: "Alternative Rock" },
  { name: "Caribou", genre: "Electronic" },
  { name: "Massive Attack", genre: "Electronic" },
  { name: "Talk Talk", genre: "Alternative Rock" },
  { name: "Joni Mitchell", genre: "Folk" },
  { name: "Fleetwood Mac", genre: "Classic Rock" },
  { name: "Miles Davis", genre: "Jazz" },
  { name: "John Coltrane", genre: "Jazz" },
  { name: "Aphex Twin", genre: "Electronic" },
  { name: "Boards of Canada", genre: "Ambient" },
  { name: "Kendrick Lamar", genre: "Hip Hop" },
  { name: "J Dilla", genre: "Hip Hop" },
  { name: "Phoebe Bridgers", genre: "Singer-Songwriter" },
  { name: "Big Thief", genre: "Indie" },
];

const TRACK_NAMES = [
  "Rope And Summit",
  "What A Fool Believes",
  "I Can't Dance",
  "Cirrus",
  "Says",
  "Weird Fishes",
  "August 10",
  "Holocene",
  "Carrie & Lowell",
  "Two Thousand and Seventeen",
  "Black Star",
  "Odessa",
  "I Know There's An Answer",
  "Teardrop",
  "It's My Life",
  "A Case of You",
  "Dreams",
  "So What",
  "Naima",
  "Avril 14th",
  "Roygbiv",
  "Alright",
  "Donuts",
  "Garden Song",
  "Not",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function makeTracks(): TrackAggregate[] {
  const tracks: TrackAggregate[] = [];
  for (let i = 0; i < 220; i++) {
    const artist = pick(ARTISTS);
    const name = `${pick(TRACK_NAMES)}${rand() > 0.6 ? "" : ` ${["", "(Reprise)", "- Remastered", "II", "(Live)"][Math.floor(rand() * 5)]}`}`.trim();
    const plays = Math.floor(2 + rand() ** 2 * 380);
    const avgMs = 180000 + Math.floor(rand() * 180000);
    const startYear = 2010 + Math.floor(rand() * 14);
    const span = Math.floor(rand() * 8);
    const yearsActive = Array.from(
      { length: span + 1 },
      (_, k) => startYear + k,
    ).filter((y) => y <= 2026);
    tracks.push({
      trackId: `mock:${i}`,
      name,
      artist: artist.name,
      album: `${artist.name} — Selected Works`,
      msPlayed: plays * avgMs,
      plays,
      firstPlayed: `${yearsActive[0]}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-15T20:00:00Z`,
      lastPlayed: `${yearsActive[yearsActive.length - 1]}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-15T20:00:00Z`,
      yearsActive,
      genre: artist.genre,
    });
  }
  return tracks.sort((a, b) => b.msPlayed - a.msPlayed);
}

function makeArtists(tracks: TrackAggregate[]): ArtistAggregate[] {
  const map = new Map<string, ArtistAggregate>();
  for (const t of tracks) {
    const cur = map.get(t.artist);
    if (cur) {
      cur.msPlayed += t.msPlayed;
      cur.plays += t.plays;
      cur.uniqueTracks += 1;
      cur.yearsActive = Array.from(
        new Set([...cur.yearsActive, ...t.yearsActive]),
      ).sort();
    } else {
      map.set(t.artist, {
        artist: t.artist,
        msPlayed: t.msPlayed,
        plays: t.plays,
        uniqueTracks: 1,
        yearsActive: [...t.yearsActive],
        topGenre: t.genre,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.msPlayed - a.msPlayed);
}

function makeGenreEvolution(): GenreYearPoint[] {
  const points: GenreYearPoint[] = [];
  for (const year of YEARS) {
    for (const g of GENRES) {
      // Each genre has its own slowly-shifting curve.
      const phase = (year - 2010) / 4 + GENRES.indexOf(g) * 0.7;
      const base = 80 + Math.sin(phase) * 60 + rand() * 40;
      points.push({
        year,
        genre: g.name,
        minutes: Math.max(10, Math.round(base * (g.name === "Indie" ? 1.5 : 1))),
      });
    }
  }
  return points;
}

function makeHeatmap(): HeatmapCell[] {
  // 366 * 24 = 8784 cells — too many for the widget. Sample a single year (2024).
  const cells: HeatmapCell[] = [];
  const year = 2024;
  const start = new Date(`${year}-01-01T00:00:00Z`);
  for (let d = 0; d < 366; d++) {
    for (let h = 0; h < 24; h++) {
      // Higher activity in evenings & late nights, more on weekends.
      const date = new Date(start.getTime() + d * 86400000);
      const dayOfWeek = date.getUTCDay();
      const eveningBoost = h >= 19 || h <= 1 ? 1.7 : h >= 8 && h <= 11 ? 1.1 : 0.4;
      const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1;
      const noise = rand() * 0.6;
      const minutes = Math.max(0, Math.round(eveningBoost * weekendBoost * (10 + noise * 30) - 8));
      if (minutes > 0) {
        cells.push({
          date: date.toISOString().slice(0, 10),
          hour: h,
          minutes,
        });
      }
    }
  }
  return cells;
}

function makeObsessions(tracks: TrackAggregate[]): Obsession[] {
  return tracks.slice(0, 14).map((t, i) => ({
    trackId: t.trackId,
    name: t.name,
    artist: t.artist,
    weekStart: `${2014 + (i % 13)}-${String(1 + (i * 3) % 12).padStart(2, "0")}-07`,
    plays: 30 + Math.floor(rand() * 80),
  }));
}

function makeSurvivors(tracks: TrackAggregate[]): Survivor[] {
  return tracks
    .filter((t) => t.yearsActive.length >= 5)
    .slice(0, 12)
    .map((t) => ({
      trackId: t.trackId,
      name: t.name,
      artist: t.artist,
      yearsActive: t.yearsActive,
      totalPlays: t.plays,
      totalMinutes: Math.round(t.msPlayed / 60000),
    }));
}

function makeInsights(): Insight[] {
  return [
    {
      id: "1",
      headline: "Late-night listening climbed 240% in winter.",
      body: "Between November and February, Bert's sessions after 23:00 nearly tripled. Ambient and Electronic dominated those hours.",
      metric: "+240%",
      tone: "ritual",
    },
    {
      id: "2",
      headline: "Snoop Dogg has appeared every single year since 2012.",
      body: "Twelve consecutive years of presence — one of only six artists with that streak in Bert's library.",
      metric: "12y",
      tone: "evolution",
    },
    {
      id: "3",
      headline: "March 2018 was Bert's Bonobo era.",
      body: "Bonobo accounted for 38% of Bert's minutes that month — his single most concentrated artist obsession on record.",
      metric: "38%",
      tone: "obsession",
    },
    {
      id: "4",
      headline: "Bert discovered 412 new artists in 2021.",
      body: "Bert's highest-ever discovery rate. The pandemic-era explorations included Khruangbin, Phoebe Bridgers and Caribou.",
      metric: "412",
      tone: "discovery",
    },
    {
      id: "5",
      headline: "Sunday mornings belong to Nils Frahm.",
      body: "73% of Bert's Sunday 08:00–11:00 minutes since 2019 are ambient or modern classical. A clear ritual.",
      metric: "73%",
      tone: "ritual",
    },
    {
      id: "6",
      headline: "Bert's taste widened by 4 new genres after 2018.",
      body: "Jazz, ambient, soul and hip-hop entered Bert's top-20 only after 2018, suggesting a deliberate curation phase.",
      metric: "+4",
      tone: "evolution",
    },
  ];
}

function makeGalaxyNodes(tracks: TrackAggregate[]): GalaxyNode[] {
  // Compact dataset (top 180) for smooth WebGL.
  const nodes: GalaxyNode[] = [];
  const artistClusters = new Map<string, number>();
  let cluster = 0;

  for (const t of tracks.slice(0, 180)) {
    if (!artistClusters.has(t.artist)) artistClusters.set(t.artist, cluster++);
    const cIdx = artistClusters.get(t.artist)!;
    const genreObj = GENRES.find((g) => g.name === t.genre) ?? GENRES[0];

    // Cluster center on a sphere
    const ca = (cIdx / Math.max(1, cluster)) * Math.PI * 2;
    const cb = ((cIdx * 1.7) % Math.PI) - Math.PI / 2;
    const cr = 5 + (cIdx % 4) * 0.6;
    const cx = Math.cos(ca) * Math.cos(cb) * cr;
    const cy = Math.sin(cb) * cr;
    const cz = Math.sin(ca) * Math.cos(cb) * cr;

    // Local jitter
    const jx = (rand() - 0.5) * 1.4;
    const jy = (rand() - 0.5) * 1.4;
    const jz = (rand() - 0.5) * 1.4;

    const lastYear = t.yearsActive[t.yearsActive.length - 1];
    const recency = Math.max(0.15, Math.min(1, (lastYear - 2009) / (2026 - 2009)));

    nodes.push({
      id: t.trackId,
      name: t.name,
      artist: t.artist,
      size: 0.05 + Math.log10(1 + t.plays) * 0.07,
      hue: genreObj.hue,
      brightness: recency,
      cluster: cIdx,
      x: cx + jx,
      y: cy + jy,
      z: cz + jz,
    });
  }
  return nodes;
}

export function buildMockDataset(): ProcessedDataset {
  const topTracks = makeTracks();
  const topArtists = makeArtists(topTracks);
  const genreEvolution = makeGenreEvolution();
  const heatmap = makeHeatmap();
  const obsessions = makeObsessions(topTracks);
  const survivors = makeSurvivors(topTracks);
  const insights = makeInsights();
  const galaxyNodes = makeGalaxyNodes(topTracks);

  const totalMinutes = Math.round(
    topTracks.reduce((acc, t) => acc + t.msPlayed, 0) / 60000,
  );
  const totalStreams = topTracks.reduce((a, t) => a + t.plays, 0);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      totalStreams,
      totalMinutes,
      totalTracks: topTracks.length,
      totalArtists: topArtists.length,
      yearRange: [2010, 2026],
    },
    topTracks: topTracks.slice(0, 50),
    topArtists: topArtists.slice(0, 30),
    genreEvolution,
    clientTimeline: [],
    heatmap,
    obsessions,
    survivors,
    insights,
    galaxyNodes,
  };
}
