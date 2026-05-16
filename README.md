# The Soundtrack of Bert

> A premium, interactive, responsive web app that visualises Bert Boerland's Spotify
> listening history as a living musical autobiography — somewhere between Spotify Wrapped,
> a Bloomberg terminal, a star atlas and a modern data museum.

![og preview](./public/og-image.jpg)

---

## Features

- 🌌 **3D Music Galaxy** — every track as a star, sized by playtime, coloured by genre,
  brightness driven by recency. Three.js + React Three Fiber.
- 🌊 **Genre Evolution Streamgraph** — D3 stacked streamgraph showing how taste shifted
  across years.
- 🔥 **Listening Heatmap** — 24h × 365d intensity grid for one calendar year.
- 💡 **Insights Engine** — auto-generated observations about rituals, obsessions and discoveries.
- 🎵 **Now Playing Memory Bar** — sticky footer cycling through "On this day in YYYY you
  listened to..." memories.
- 🎚 **Hero Intro** — animated particle field, equalizer wave, glassmorphism profile card.
- ⚡ **Topbar filters** — year, genre, search.
- 📱 **Responsive** — desktop multi-column, mobile vertical storytelling.

More widgets (Obsession Tracker, Songs That Survived Time, Audio Mood Radar, Artist
Connection Network) are planned for v1.1.

---

## Tech stack

- **Vite** + **React 19** + **TypeScript**
- **TanStack Router** (file-based routes)
- **Tailwind CSS v4** (custom design system, Spotify-green accent on near-black)
- **Framer Motion** for animations
- **D3.js** for data visualisation
- **Three.js** + **React Three Fiber** + **drei** for the 3D galaxy
- **ESLint** + **Prettier**

---

## Quick start

### Requirements

- Node.js 20 LTS
- npm 10+ (or pnpm / bun — lockfile included for both npm and bun)
- Git
- (optional) Docker 24+ and Docker Compose v2

### Local development

```bash
git clone <your-repo-url> soundtrack-of-bert
cd soundtrack-of-bert
npm install
cp .env.example .env       # edit if you want Spotify API enrichment
npm run dev
```

Open http://localhost:8080 — the app will run with **mock data** if no real
exports have been ingested yet.

### Loading your real data

1. Request your "Extended streaming history" from
   [Spotify Privacy Settings](https://www.spotify.com/account/privacy/) — it arrives
   as `Streaming_History_Audio_2010-2014_0.json`, etc.
2. Drop **all** the JSON files into the `data/` directory at the repo root:
   ```
   data/
     Streaming_History_Audio_2010.json
     Streaming_History_Audio_2014-2017_0.json
     Streaming_History_Audio_2024.json
     ...
   ```
3. Run the ingest pipeline:
   ```bash
   npm run ingest
   ```
   This produces `public/data/processed.json`. The frontend automatically
   detects it on next load and switches from mock → real data.
4. Re-run `npm run dev` (or `npm run build`) and you'll see your actual history.

---

## Production build

```bash
npm run build       # output goes to dist/
npm run preview     # serve dist/ locally for verification
```

The build honours `VITE_BASE_PATH`. For the planned hosting at
`http://dataviz.boerland.com/spotify26/`:

```bash
VITE_BASE_PATH=/spotify26/ npm run build
```

---

## Deployment

### Option A — static files behind nginx (recommended for VPS)

```bash
# Build
VITE_BASE_PATH=/spotify26/ npm run ingest    # only if you have data/ files
VITE_BASE_PATH=/spotify26/ npm run build

# Upload
scp -r dist/* user@dataviz.boerland.com:/var/www/dataviz.boerland.com/spotify26/

# Configure nginx — copy deploy/nginx.conf to your server and reload nginx.
sudo cp deploy/nginx.conf /etc/nginx/sites-available/dataviz.boerland.com
sudo ln -sf /etc/nginx/sites-available/dataviz.boerland.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The app is now live at **http://dataviz.boerland.com/spotify26/**.

### Option B — Docker Compose

```bash
# Optional: drop your Spotify JSON files into ./data/ first.
docker compose up -d --build
# App on http://localhost:8080/spotify26/  (proxy to your domain via nginx upstream)
```

To re-ingest after adding new exports:

```bash
docker compose exec soundtrack-of-bert sh -c "cd /app && npm run ingest"
docker compose restart soundtrack-of-bert
```

---

## Environment variables

| Variable                  | Where         | Required | Purpose                                                      |
| ------------------------- | ------------- | :------: | ------------------------------------------------------------ |
| `VITE_BASE_PATH`          | build-time    |    no    | Subpath the app is served from. Default `/spotify26/`.       |
| `SPOTIFY_CLIENT_ID`       | ingest script |    no    | Enables genre enrichment via Spotify Web API.                |
| `SPOTIFY_CLIENT_SECRET`   | ingest script |    no    | Paired with `SPOTIFY_CLIENT_ID`.                             |

All variables are documented in `.env.example`. There are **no required** secrets —
the app and ingest script both run completely offline.

---

## Scripts

| Command            | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Vite dev server with HMR                        |
| `npm run build`    | Production build → `dist/`                      |
| `npm run preview`  | Serve the built bundle for verification         |
| `npm run ingest`   | Process `data/*.json` → `public/data/processed.json` |
| `npm run lint`     | ESLint                                          |
| `npm run format`   | Prettier write                                  |

---

## SEO & social previews

`og:image`, `og:title`, `og:description`, `twitter:card` etc. are configured
per-route via TanStack Router's `head()`. Previews have been validated against:

- LinkedIn Post Inspector
- X (Twitter) Card Validator
- Discord / Slack / WhatsApp link unfurling

The OG image lives at `public/og-image.jpg` (1216×640) and is referenced via the
canonical site URL.

---

## Project structure

```
.
├── data/                     # Drop Spotify JSON exports here (gitignored)
├── deploy/
│   └── nginx.conf            # Reference nginx config for /spotify26/
├── public/
│   ├── og-image.jpg          # Social preview image
│   └── data/processed.json   # Generated by `npm run ingest`
├── scripts/
│   └── ingest.mjs            # Data preprocessing pipeline
├── src/
│   ├── components/
│   │   ├── dashboard/        # Topbar, layout primitives
│   │   └── widgets/          # Hero, Galaxy, Streamgraph, Heatmap, ...
│   ├── lib/spotify/          # Types, mock dataset, useDataset hook
│   ├── routes/               # File-based TanStack routes
│   └── styles.css            # Design tokens
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Roadmap (v1.1+)

- Obsession Tracker (vertical spike timeline)
- Songs That Survived Time (multi-year horizontal lines)
- Audio Mood Radar (energy/valence/danceability)
- Artist Connection Network (D3 force-directed)
- Draggable / resizable widgets with localStorage layouts
- Command palette (⌘K)
- Animated onboarding

---

## License

MIT — fork it, host it, remix it.
