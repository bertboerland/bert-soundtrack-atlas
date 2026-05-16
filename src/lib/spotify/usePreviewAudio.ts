import { useCallback, useEffect, useRef, useState } from "react";

/**
 * iTunes Search API → 30s preview mp3. No auth, CORS-friendly.
 * Cached across the app session so repeated hovers don't re-fetch.
 */
const PREVIEW_CACHE = new Map<string, string | null>();

async function fetchPreviewUrl(
  artist: string,
  track: string,
): Promise<string | null> {
  const key = `${artist}::${track}`;
  if (PREVIEW_CACHE.has(key)) return PREVIEW_CACHE.get(key)!;
  try {
    const q = encodeURIComponent(`${artist} ${track}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${q}&media=music&limit=1`,
    );
    const json = (await res.json()) as {
      results?: Array<{ previewUrl?: string }>;
    };
    const url = json.results?.[0]?.previewUrl ?? null;
    PREVIEW_CACHE.set(key, url);
    return url;
  } catch {
    PREVIEW_CACHE.set(key, null);
    return null;
  }
}

export type PreviewState = "idle" | "loading" | "playing" | "unavailable";

/** Module-level shared audio element so only ONE preview ever plays at a time
 *  across the whole app, even across components. */
let SHARED_AUDIO: HTMLAudioElement | null = null;
let CURRENT_KEY: string | null = null;
let LINGER_TIMER: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(key: string | null, state: PreviewState) => void>();

function notify(key: string | null, state: PreviewState) {
  CURRENT_KEY = key;
  for (const l of listeners) l(key, state);
}

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!SHARED_AUDIO) {
    SHARED_AUDIO = new Audio();
    SHARED_AUDIO.volume = 0.5;
    SHARED_AUDIO.preload = "none";
    SHARED_AUDIO.addEventListener("ended", () => notify(null, "idle"));
  }
  return SHARED_AUDIO;
}

/**
 * Hover a track to start streaming its 30s iTunes preview.
 * - Calling `play(artist, track)` starts (or keeps) playback for that track.
 * - Calling `release()` keeps it playing for `lingerMs` (default 10s).
 *   Hovering a different track within that window cancels the linger and
 *   switches preview immediately.
 */
export function usePreviewAudio(lingerMs = 10_000) {
  const [state, setState] = useState<PreviewState>("idle");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const cancelRef = useRef<{ key: string } | null>(null);

  // Subscribe to global state so multiple instances stay in sync.
  useEffect(() => {
    const l = (key: string | null, s: PreviewState) => {
      setActiveKey(key);
      setState(s);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const play = useCallback((artist: string, track: string) => {
    const audio = getAudio();
    if (!audio) return;
    const key = `${artist}::${track}`;

    // Hovering the same track that's already playing/loading? Just cancel any
    // pending linger and keep going.
    if (LINGER_TIMER) {
      clearTimeout(LINGER_TIMER);
      LINGER_TIMER = null;
    }
    if (CURRENT_KEY === key && (state === "playing" || state === "loading")) {
      return;
    }

    // Switching to a new track: stop the old one.
    audio.pause();
    audio.currentTime = 0;
    notify(key, "loading");
    cancelRef.current = { key };

    fetchPreviewUrl(artist, track).then((url) => {
      // If a newer hover already replaced us, abort.
      if (CURRENT_KEY !== key) return;
      if (!url) {
        notify(key, "unavailable");
        return;
      }
      audio.src = url;
      audio
        .play()
        .then(() => {
          if (CURRENT_KEY === key) notify(key, "playing");
        })
        .catch(() => {
          if (CURRENT_KEY === key) notify(key, "unavailable");
        });
    });
  }, [state]);

  const release = useCallback(() => {
    const audio = getAudio();
    if (!audio) return;
    if (LINGER_TIMER) clearTimeout(LINGER_TIMER);
    LINGER_TIMER = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      notify(null, "idle");
      LINGER_TIMER = null;
    }, lingerMs);
  }, [lingerMs]);

  return { play, release, state, activeKey };
}
