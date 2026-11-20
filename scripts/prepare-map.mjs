import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const topology = require("world-atlas/countries-110m.json");
const topojson = require("topojson-client");
const iso31661 = require("iso-3166-1");
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "public/world.geojson");
const collection = topojson.feature(topology, topology.objects.countries);

const features = collection.features.map((feature) => {
  const code = iso31661.whereNumeric(feature.id);
  return {
    type: "Feature",
    id: feature.id,
    properties: {
      name: feature.properties?.name || code?.country || "Territorio",
      "ISO3166-1-Alpha-2": code?.alpha2 || null,
      "ISO3166-1-Alpha-3": code?.alpha3 || null,
      "ISO3166-1-numeric": feature.id,
    },
    geometry: feature.geometry,
  };
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify({ type: "FeatureCollection", name: "natural-earth-110m", features })}\n`,
  "utf8",
);
console.log(
  `Mapa listo: ${features.length} territorios en public/world.geojson`,
);
