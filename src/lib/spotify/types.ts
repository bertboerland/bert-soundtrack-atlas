/**
 * Spotify Extended Streaming History — raw record shape.
 * Matches the JSON exports under data/Streaming_History_Audio_*.json.
 */
export interface RawStreamRecord {
  ts: string;
  platform: string | null;
  ms_played: number;
  conn_country: string | null;
  ip_addr: string | null;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
  episode_name: string | null;
  episode_show_name: string | null;
  spotify_episode_uri: string | null;
  audiobook_title: string | null;
  audiobook_uri: string | null;
  audiobook_chapter_uri: string | null;
  audiobook_chapter_title: string | null;
  reason_start: string | null;
  reason_end: string | null;
  shuffle: boolean | null;
  skipped: boolean | null;
  offline: boolean | null;
  offline_timestamp: number | null;
  incognito_mode: boolean | null;
}

/** Processed dataset shipped to the frontend after ingest. */
export interface ProcessedDataset {
  meta: {
    generatedAt: string;
    totalStreams: number;
    totalMinutes: number;
    totalTracks: number;
    totalArtists: number;
    yearRange: [number, number];
  };
  topTracks: TrackAggregate[];
  topArtists: ArtistAggregate[];
  genreEvolution: GenreYearPoint[];
  heatmap: HeatmapCell[];
  obsessions: Obsession[];
  survivors: Survivor[];
  insights: Insight[];
  galaxyNodes: GalaxyNode[];
}

export interface TrackAggregate {
  trackId: string;
  name: string;
  artist: string;
  album: string;
  msPlayed: number;
  plays: number;
  firstPlayed: string;
  lastPlayed: string;
  yearsActive: number[];
  genre: string;
}

export interface ArtistAggregate {
  artist: string;
  msPlayed: number;
  plays: number;
  uniqueTracks: number;
  yearsActive: number[];
  topGenre: string;
}

export interface GenreYearPoint {
  year: number;
  genre: string;
  minutes: number;
}

export interface HeatmapCell {
  date: string; // YYYY-MM-DD
  hour: number;
  minutes: number;
  topTrack?: string;
}

export interface Obsession {
  trackId: string;
  name: string;
  artist: string;
  weekStart: string;
  plays: number;
}

export interface Survivor {
  trackId: string;
  name: string;
  artist: string;
  yearsActive: number[];
  totalPlays: number;
  totalMinutes: number;
}

export interface Insight {
  id: string;
  headline: string;
  body: string;
  metric?: string;
  tone: "discovery" | "ritual" | "obsession" | "evolution";
}

export interface GalaxyNode {
  id: string;
  name: string;
  artist: string;
  size: number;       // log-scaled playtime
  hue: number;        // genre hue
  brightness: number; // recency 0..1
  cluster: number;    // artist cluster id
  x: number;
  y: number;
  z: number;
}
