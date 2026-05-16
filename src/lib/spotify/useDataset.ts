import { useEffect, useState } from "react";
import type { ProcessedDataset } from "./types";
import { buildMockDataset } from "./mockDataset";

/**
 * Loads the processed dataset.
 *
 * Resolution order:
 *  1. /spotify26/processed.json      (static host fallback for locked-down Apache dirs)
 *  2. /spotify26/data/processed.json (production: written by `npm run ingest`)
 *  3. /data/processed.json           (dev fallback)
 *  4. Generated mock dataset         (preview / when no data is present)
 */
export function useDataset() {
  const [data, setData] = useState<ProcessedDataset | null>(null);
  const [source, setSource] = useState<"real" | "mock" | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    const candidates = [
      `${import.meta.env.BASE_URL}processed.json`,
      `${import.meta.env.BASE_URL}data/processed.json`,
      `/data/processed.json`,
    ];

    (async () => {
      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const json = (await res.json()) as ProcessedDataset;
            if (!cancelled) {
              setData(json);
              setSource("real");
            }
            return;
          }
        } catch {
          /* try next */
        }
      }
      if (!cancelled) {
        setData(buildMockDataset());
        setSource("mock");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, source };
}
