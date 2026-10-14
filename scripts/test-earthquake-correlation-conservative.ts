import assert from "node:assert/strict";

import { correlateEarthquakes } from "../lib/disaster-service";
import type { Earthquake } from "../types/disaster";

const base: Earthquake = {
  id: "bmkg-main",
  canonicalEventKey: "bmkg-2026-10-14-10-00-00",
  source: "BMKG",
  sourcePrimary: "BMKG",
  title: "Gempa utama",
  magnitude: 5.8,
  depth: "10 km",
  depthKm: 10,
  latitude: -6.8,
  longitude: 107.1,
  timestamp: Date.parse("2026-10-14T03:00:00Z"),
  time: "10:00 WIB",
  priorityRadiusKm: 50,
  monitoringRadiusKm: 110,
  potensiTsunami: false,
};

const sameFromUsgs: Earthquake = {
  ...base,
  id: "usgs-main",
  canonicalEventKey: "usgs-main",
  source: "USGS",
  sourcePrimary: "USGS",
  timestamp: base.timestamp + 30_000,
  latitude: -6.81,
  longitude: 107.11,
  magnitude: 5.7,
};

const aftershock: Earthquake = {
  ...base,
  id: "usgs-aftershock",
  canonicalEventKey: "usgs-aftershock",
  source: "USGS",
  sourcePrimary: "USGS",
  title: "Gempa susulan",
  timestamp: base.timestamp + 8 * 60_000,
  latitude: -6.82,
  longitude: 107.12,
  magnitude: 5.6,
};

assert.equal(correlateEarthquakes([base, sameFromUsgs]).length, 1);
assert.equal(correlateEarthquakes([base, aftershock]).length, 2);

const sameProviderDifferentIds = correlateEarthquakes([
  base,
  { ...base, id: "bmkg-after", canonicalEventKey: "bmkg-after", timestamp: base.timestamp + 60_000 },
]);
assert.equal(sameProviderDifferentIds.length, 2);

console.log("PASS conservative correlation: same event merges, aftershock and ambiguity stay separate");
