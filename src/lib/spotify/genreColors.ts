/**
 * Shared genre palette — used by the streamgraph, the 3D galaxy and the
 * listening heatmap so visual identity stays consistent across widgets.
 *
 * Curated colors match the umbrella genres produced by scripts/ingest.mjs /
 * scripts/enrich-genres.mjs. Unknown / one-off genres fall back to a stable
 * hash-based hue so they're at least visually distinct.
 */

export const GENRE_PALETTE: Record<string, string> = {
  "Electronic":          "#22d3ee", // cyan
  "Hip-Hop":             "#f97316", // orange
  "Soul & R&B":          "#f59e0b", // amber
  "Jazz":                "#a78bfa", // violet
  "Classical":           "#e2e8f0", // ivory
  "Metal":               "#dc2626", // crimson
  "Punk":                "#ef4444", // red
  "Folk & Country":      "#84cc16", // lime
  "Indie / Alternative": "#ec4899", // pink
  "Rock":                "#3b82f6", // blue
  "Pop":                 "#f472b6", // rose
  "Reggae":              "#10b981", // emerald
  "World":               "#eab308", // gold
  "Blues":               "#6366f1", // indigo
  "Soundtrack":          "#94a3b8", // slate
  "Unknown":             "#64748b", // muted slate
};

/** Stable hash-based fallback for genres not in the palette. */
function fallbackColor(genre: string): string {
  let h = 0;
  for (let i = 0; i < genre.length; i++) h = (h * 31 + genre.charCodeAt(i)) % 360;
  return `hsl(${h} 65% 58%)`;
}

export function colorForGenre(genre: string | undefined | null): string {
  if (!genre) return GENRE_PALETTE.Unknown;
  return GENRE_PALETTE[genre] ?? fallbackColor(genre);
}

/** Ordered list (matches roughly the era they entered Bert's library). */
export const GENRE_ORDER = [
  "Rock",
  "Indie / Alternative",
  "Punk",
  "Metal",
  "Pop",
  "Electronic",
  "Hip-Hop",
  "Soul & R&B",
  "Jazz",
  "Blues",
  "Folk & Country",
  "Reggae",
  "World",
  "Classical",
  "Soundtrack",
  "Unknown",
];
