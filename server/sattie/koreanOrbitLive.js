import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getOrbitSamplingConfig, propagateOmmPoint } from "./orbitPropagation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const liveCachePath = path.join(__dirname, "data", "satellite-live-cache.json");
const TRACK_CACHE_MS = 10_000;

let sourceCache = null;
let trackCache = null;

async function loadSourceEntries() {
  if (sourceCache) {
    return sourceCache;
  }

  const raw = await fs.readFile(liveCachePath, "utf8");
  const parsed = JSON.parse(raw);
  const entries = Object.values(parsed.entries ?? {})
    .map((entry) => {
      const fleetEntry = entry?.fleetEntry;
      if (!fleetEntry?.norad || !fleetEntry?.omm || fleetEntry.orbitClass === "cislunar") {
        return null;
      }

      return {
        fetchedAt: entry.fetchedAt ?? null,
        fleetEntry,
      };
    })
    .filter(Boolean);

  sourceCache = {
    updatedAt: parsed.updatedAt ?? null,
    entries,
  };
  return sourceCache;
}

export async function getKoreanOrbitLiveTracks() {
  const now = new Date();
  if (trackCache && now.getTime() - trackCache.generatedAtMs < TRACK_CACHE_MS) {
    return trackCache.payload;
  }

  const source = await loadSourceEntries();
  const entries = [];

  for (const record of source.entries) {
    const current = propagateOmmPoint(record.fleetEntry.omm, now);
    if (!current) {
      continue;
    }

    const sampling = getOrbitSamplingConfig(record.fleetEntry.omm, record.fleetEntry.orbitClass);
    const track = [];
    for (
      let minute = -sampling.halfWindowMinutes;
      minute <= sampling.halfWindowMinutes;
      minute += sampling.sampleStepMinutes
    ) {
      const sampleDate = new Date(now.getTime() + minute * 60_000);
      const state = propagateOmmPoint(record.fleetEntry.omm, sampleDate);
      if (!state) {
        continue;
      }

      track.push({
        latitude: Number(state.latitude.toFixed(4)),
        longitude: Number(state.longitude.toFixed(4)),
        altitudeKm: Math.round(state.altitudeKm * 10) / 10,
      });
    }

    entries.push({
      norad: String(record.fleetEntry.norad),
      english_name: record.fleetEntry.englishName ?? record.fleetEntry.name,
      domestic_name: record.fleetEntry.domesticName ?? null,
      orbit_class: record.fleetEntry.orbitClass ?? null,
      orbit_label: record.fleetEntry.orbitLabel ?? null,
      source_date: record.fleetEntry.sourceDate ?? null,
      source_label: record.fleetEntry.sourceLabel ?? null,
      fetched_at: record.fetchedAt,
      period_minutes: sampling.periodMinutes,
      current: {
        latitude: Number(current.latitude.toFixed(4)),
        longitude: Number(current.longitude.toFixed(4)),
        altitudeKm: Math.round(current.altitudeKm * 10) / 10,
      },
      track,
    });
  }

  const payload = {
    source: "vendored satellite-live-cache.json",
    updated_at: source.updatedAt,
    generated_at: now.toISOString(),
    count: entries.length,
    entries,
  };

  trackCache = {
    generatedAtMs: now.getTime(),
    payload,
  };

  return payload;
}
