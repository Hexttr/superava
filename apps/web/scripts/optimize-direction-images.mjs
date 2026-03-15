#!/usr/bin/env node
import sharp from "sharp";
import { mkdir, stat } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const AVA = join(ROOT, "ava");
const OUT = join(__dirname, "..", "public", "images");

const MAPPING = [
  { src: "001.png", out: "direction-prompt.webp" },
  { src: "002.png", out: "direction-gallery.webp" },
  { src: "003.png", out: "direction-reference.webp" },
];

const MAX_SIZE = 800;

await mkdir(OUT, { recursive: true });

for (const { src, out } of MAPPING) {
  const input = join(AVA, src);
  const output = join(OUT, out);
  const img = sharp(input);
  const meta = await img.metadata();
  console.log(`${src}: ${meta.width}x${meta.height}`);
  await img
    .resize(MAX_SIZE, MAX_SIZE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  const { size } = await stat(output);
  console.log(`  -> ${out} (${Math.round(size / 1024)} KB)`);
}

console.log("Done.");
