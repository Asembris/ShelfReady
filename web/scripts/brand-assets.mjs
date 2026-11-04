import { mkdir, copyFile, readFile } from "node:fs/promises";
const source = new URL("../../brand/", import.meta.url);
const target = new URL("../public/brand/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("manifest.json", source), "utf8"),
);
for (const file of [
  ...manifest.assets.map((a) => a.file),
  "tokens.css",
  manifest.font.file,
  manifest.font.license,
]) {
  const to = new URL(file, target);
  await mkdir(new URL(".", to), { recursive: true });
  await copyFile(new URL(file, source), to);
}
