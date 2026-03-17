import { randomUUID } from "node:crypto";
import {
  GROUND_STATION_PRESETS,
  GROUND_STATION_REQUESTOR_PRESETS,
  SATELLITE_BASELINES,
} from "./catalog.js";
import { all, get, run } from "./db.js";

function nowIso() {
  return new Date().toISOString();
}

function normalizeIdToken(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function makeSatellitePublicId(engModel) {
  return String(engModel ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function makeUniqueId(base, usedIds) {
  if (!usedIds.has(base)) {
    return base;
  }
  let suffix = 2;
  while (usedIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

function buildGroundStationAlias(name, location) {
  const locationToken = normalizeIdToken(location).slice(0, 3) || normalizeIdToken(name).slice(0, 3) || "GND";
  const words = String(name)
    .toUpperCase()
    .match(/[A-Z0-9]+/g) ?? [];
  const stopwords = new Set(["GROUND", "STATION", "SATELLITE", "BASE", "CENTER", "CONTROL"]);
  const filtered = words.filter((word) => !stopwords.has(word));
  const initials = (filtered.slice(0, 4).map((word) => word[0]).join("") || "GS").slice(0, 4);
  return `${locationToken}-${initials}`;
}

async function recordSeedEvent(db, seedType, seedCount) {
  await run(
    db,
    `INSERT INTO sattie_seed_history (seed_type, seed_count, created_at)
     VALUES (?, ?, ?)`,
    [seedType, seedCount, nowIso()],
  );
}

export async function seedMockSatellites(db) {
  const existing = await all(db, `SELECT satellite_id FROM sattie_satellites`);
  const usedIds = new Set(existing.map((row) => row.satellite_id));
  const now = nowIso();
  const seededIds = [];

  for (const baseline of SATELLITE_BASELINES) {
    const satelliteId = makeSatellitePublicId(baseline.eng_model);
    if (usedIds.has(satelliteId)) {
      continue;
    }

    const internalCode = `sat-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const type = baseline.domain === "SAR" ? "SAR" : "EO_OPTICAL";
    const name = `${baseline.kor_name} (${baseline.eng_model})`;

    await run(
      db,
      `INSERT INTO sattie_satellites (
        internal_satellite_code, satellite_id, name, type, status,
        eng_model, domain, resolution_perf, baseline_status, primary_mission,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        internalCode,
        satelliteId,
        name,
        type,
        "AVAILABLE",
        baseline.eng_model,
        baseline.domain,
        baseline.resolution_perf,
        baseline.baseline_status,
        baseline.primary_mission,
        now,
        now,
      ],
    );

    seededIds.push(satelliteId);
    usedIds.add(satelliteId);
  }

  await recordSeedEvent(db, "mock-satellites", seededIds.length);
  return seededIds;
}

export async function seedMockGroundStations(db) {
  const rows = await all(db, `SELECT ground_station_id, name FROM sattie_ground_stations`);
  const usedIds = new Set(rows.map((row) => row.ground_station_id));
  const usedNames = new Set(rows.map((row) => row.name.trim().toLowerCase()));
  const seededIds = [];
  const now = nowIso();

  for (const [name, type, location] of GROUND_STATION_PRESETS) {
    if (usedNames.has(name.trim().toLowerCase())) {
      continue;
    }

    const alias = makeUniqueId(buildGroundStationAlias(name, location), usedIds);
    const internalCode = `gnd-${randomUUID().replace(/-/g, "").slice(0, 8)}`;

    await run(
      db,
      `INSERT INTO sattie_ground_stations (
        internal_ground_station_code, ground_station_id, name, type, status, location, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [internalCode, alias, name, type, "OPERATIONAL", location, now, now],
    );

    seededIds.push(alias);
    usedIds.add(alias);
    usedNames.add(name.trim().toLowerCase());
  }

  await recordSeedEvent(db, "mock-ground-stations", seededIds.length);
  return seededIds;
}

export async function seedMockRequestors(db) {
  const stations = await all(
    db,
    `SELECT internal_ground_station_code, ground_station_id, name
     FROM sattie_ground_stations
     ORDER BY name`,
  );
  const existing = await all(
    db,
    `SELECT name, internal_ground_station_code FROM sattie_requestors`,
  );
  const existingPairs = new Set(
    existing.map((row) => `${row.internal_ground_station_code}::${row.name.trim().toLowerCase()}`),
  );
  const seededIds = [];
  const now = nowIso();

  for (const station of stations) {
    const preset = Object.entries(GROUND_STATION_REQUESTOR_PRESETS).find(([keyword]) =>
      station.name.includes(keyword),
    )?.[1] ?? [`${station.name} Requestor Alpha`, `${station.name} Requestor Bravo`];

    for (const requestorName of preset) {
      const pairKey = `${station.internal_ground_station_code}::${requestorName.trim().toLowerCase()}`;
      if (existingPairs.has(pairKey)) {
        continue;
      }

      const requestorId = `req-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
      await run(
        db,
        `INSERT INTO sattie_requestors (
          requestor_id, name, internal_ground_station_code, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [requestorId, requestorName, station.internal_ground_station_code, now, now],
      );

      seededIds.push(requestorId);
      existingPairs.add(pairKey);
    }
  }

  await recordSeedEvent(db, "mock-requestors", seededIds.length);
  return seededIds;
}

export async function ensureSattieBootstrap(db) {
  const row = await get(
    db,
    `SELECT
      (SELECT COUNT(*) FROM sattie_satellites) AS satellites_count,
      (SELECT COUNT(*) FROM sattie_ground_stations) AS ground_stations_count,
      (SELECT COUNT(*) FROM sattie_requestors) AS requestors_count,
      (SELECT COUNT(*) FROM sattie_commands) AS commands_count`,
  );

  const counts = {
    satellites: Number(row?.satellites_count ?? 0),
    groundStations: Number(row?.ground_stations_count ?? 0),
    requestors: Number(row?.requestors_count ?? 0),
    commands: Number(row?.commands_count ?? 0),
  };

  if (counts.satellites === 0) {
    counts.satellites = (await seedMockSatellites(db)).length;
  }

  if (counts.groundStations === 0) {
    counts.groundStations = (await seedMockGroundStations(db)).length;
  }

  if (counts.requestors === 0) {
    counts.requestors = (await seedMockRequestors(db)).length;
  }

  await recordSeedEvent(db, "bootstrap-check", counts.satellites + counts.groundStations + counts.requestors);

  return counts;
}
