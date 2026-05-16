import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { GalaxyNode } from "@/lib/spotify/types";
import { colorForGenre } from "@/lib/spotify/genreColors";

/**
 * iTunes Search API → 30s preview mp3. No auth, CORS-friendly.
 * Returns null if nothing matches or the request fails.
 */
const PREVIEW_CACHE = new Map<string, string | null>();
async function fetchPreviewUrl(artist: string, track: string): Promise<string | null> {
  const key = `${artist}::${track}`;
  if (PREVIEW_CACHE.has(key)) return PREVIEW_CACHE.get(key)!;
  try {
    const q = encodeURIComponent(`${artist} ${track}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${q}&media=music&limit=1`,
    );
    const json = (await res.json()) as { results?: Array<{ previewUrl?: string }> };
    const url = json.results?.[0]?.previewUrl ?? null;
    PREVIEW_CACHE.set(key, url);
    return url;
  } catch {
    PREVIEW_CACHE.set(key, null);
    return null;
  }
}

interface GalaxyProps {
  nodes: GalaxyNode[];
  /** Map of trackId → genre (and artist → genre). Used to color nodes
   *  consistently with the streamgraph + heatmap. */
  trackGenres?: Record<string, string>;
  artistGenres?: Record<string, string>;
}

interface EnrichedNode extends GalaxyNode {
  genre: string;
  color: string;
}

export function MusicGalaxy3D({ nodes, trackGenres = {}, artistGenres = {} }: GalaxyProps) {
  const [hovered, setHovered] = useState<EnrichedNode | null>(null);

  const enriched: EnrichedNode[] = useMemo(
    () =>
      nodes.map((n) => {
        const genre =
          trackGenres[n.id] ?? artistGenres[n.artist] ?? "Unknown";
        return { ...n, genre, color: colorForGenre(genre) };
      }),
    [nodes, trackGenres, artistGenres],
  );

  // Group nodes by artist so we can draw constellation lines + a centroid.
  const constellations = useMemo(() => {
    const byArtist = new Map<string, EnrichedNode[]>();
    for (const n of enriched) {
      if (!byArtist.has(n.artist)) byArtist.set(n.artist, []);
      byArtist.get(n.artist)!.push(n);
    }
    return [...byArtist.entries()]
      .filter(([, ns]) => ns.length >= 2)
      .map(([artist, ns]) => {
        // Centroid = mean position; lines fan out from it to each track.
        const cx = ns.reduce((s, n) => s + n.x, 0) / ns.length;
        const cy = ns.reduce((s, n) => s + n.y, 0) / ns.length;
        const cz = ns.reduce((s, n) => s + n.z, 0) / ns.length;
        return {
          artist,
          genre: ns[0].genre,
          color: ns[0].color,
          center: [cx, cy, cz] as [number, number, number],
          tracks: ns,
        };
      });
  }, [enriched]);

  // Unique genres present, for the legend.
  const genreLegend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of enriched) counts.set(n.genre, (counts.get(n.genre) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([genre]) => ({ genre, color: colorForGenre(genre) }));
  }, [enriched]);

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-b-2xl">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Spinning up the galaxy…
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 18], fov: 55 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={["#0b0b0b"]} />
          <fog attach="fog" args={["#0b0b0b", 16, 38]} />
          <ambientLight intensity={0.35} />
          <pointLight position={[10, 10, 10]} intensity={0.4} color="#1DB954" />
          <Stars />
          <ConstellationCloud
            nodes={enriched}
            constellations={constellations}
            onHover={setHovered}
          />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            autoRotate
            autoRotateSpeed={0.35}
            minDistance={10}
            maxDistance={32}
          />
        </Canvas>
      </Suspense>

      {/* Top hint */}
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-white/10 bg-background/70 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
        Drag to orbit · scroll to zoom · lines connect tracks by the same artist
      </div>

      {/* Genre legend */}
      <div className="pointer-events-none absolute right-3 top-3 max-w-[200px] rounded-xl border border-white/10 bg-background/70 px-3 py-2 backdrop-blur">
        <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Genres
        </div>
        <div className="flex flex-col gap-1">
          {genreLegend.map((g) => (
            <div key={g.genre} className="flex items-center gap-2 text-[11px]">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: g.color, boxShadow: `0 0 6px ${g.color}` }}
              />
              <span className="text-foreground/80">{g.genre}</span>
            </div>
          ))}
        </div>
      </div>

      {hovered && (
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-xl border border-white/10 bg-background/85 px-4 py-3 backdrop-blur-md"
          style={{ borderColor: hovered.color + "66" }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: hovered.color }}
          >
            {hovered.artist} · {hovered.genre}
          </div>
          <div className="mt-0.5 font-display text-sm font-medium text-foreground">
            {hovered.name}
          </div>
        </div>
      )}
    </div>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const arr = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const r = 24 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi);
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#ffffff" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function ConstellationCloud({
  nodes,
  constellations,
  onHover,
}: {
  nodes: EnrichedNode[];
  constellations: {
    artist: string;
    genre: string;
    color: string;
    center: [number, number, number];
    tracks: EnrichedNode[];
  }[];
  onHover: (n: EnrichedNode | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group ref={groupRef}>
      {/* Constellation lines — fan out from artist centroid to each track */}
      {constellations.map((c) => (
        <ArtistConstellation key={c.artist} constellation={c} />
      ))}

      {/* Stars */}
      {nodes.map((node) => (
        <Star key={node.id} node={node} onHover={onHover} />
      ))}
    </group>
  );
}

function ArtistConstellation({
  constellation,
}: {
  constellation: {
    color: string;
    center: [number, number, number];
    tracks: EnrichedNode[];
  };
}) {
  const { positions, color } = useMemo(() => {
    const arr: number[] = [];
    const [cx, cy, cz] = constellation.center;
    for (const t of constellation.tracks) {
      arr.push(cx, cy, cz, t.x, t.y, t.z);
    }
    return {
      positions: new Float32Array(arr),
      color: new THREE.Color(constellation.color),
    };
  }, [constellation]);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.28}
        toneMapped={false}
      />
    </lineSegments>
  );
}

function Star({
  node,
  onHover,
}: {
  node: EnrichedNode;
  onHover: (n: EnrichedNode | null) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(node.color), [node.color]);

  return (
    <mesh
      ref={ref}
      position={[node.x, node.y, node.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(node);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "auto";
      }}
    >
      <sphereGeometry args={[node.size, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6 + node.brightness * 1.4}
        toneMapped={false}
      />
    </mesh>
  );
}
