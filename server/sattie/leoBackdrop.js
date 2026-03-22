import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { propagateOmmPoint } from "./orbitPropagation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, "data", "leo-live-cache.json");
const POINT_CACHE_MS = 10_000;

let sourceCache = null;
let pointCache = null;

async function loadSourceEntries() {
  if (sourceCache) {
    return sourceCache;
  }

  const raw = await fs.readFile(sourcePath, "utf8");
  const parsed = JSON.parse(raw);
  sourceCache = {
    updatedAt: parsed.updatedAt ?? null,
    fetchedAt: parsed.fetchedAt ?? null,
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
  };
  return sourceCache;
}

export async function getLeoBackdropPoints() {
  const now = new Date();
  if (pointCache && now.getTime() - pointCache.generatedAtMs < POINT_CACHE_MS) {
    return pointCache.payload;
  }

  const source = await loadSourceEntries();
  const points = [];

  for (const entry of source.entries) {
    const state = propagateOmmPoint(entry.omm ?? {}, now);
    if (!state) {
      continue;
    }

    points.push({
      norad: String(entry.norad ?? entry.omm?.NORAD_CAT_ID ?? ""),
      name: String(entry.name ?? entry.omm?.OBJECT_NAME ?? "UNKNOWN"),
      latitude: state.latitude,
      longitude: state.longitude,
      altitude_km: state.altitudeKm,
      source_date: entry.sourceDate ?? null,
      source_state: entry.sourceState ?? null,
    });
  }

  const payload = {
    source: "vendored leo-live-cache.json",
    updated_at: source.updatedAt,
    fetched_at: source.fetchedAt,
    generated_at: now.toISOString(),
    total_count: source.entries.length,
    rendered_count: points.length,
    points,
  };

  pointCache = {
    generatedAtMs: now.getTime(),
    payload,
  };

  return payload;
}
