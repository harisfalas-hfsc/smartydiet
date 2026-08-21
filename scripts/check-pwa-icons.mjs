// Build-time guard: the PWA manifest icon set must be stable and complete
// across deployments, otherwise Chrome shows an "app identity changed" warning
// on reinstall. Fails the build when an icon entry is missing, mis-sized, or
// when multiple same-size variants could make Android alternate identity art.
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const publicDir = path.resolve(process.cwd(), "public");
const manifestPath = path.join(publicDir, "manifest.webmanifest");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const errors = [];
const seen = new Set();

if (manifest.id !== "/" || manifest.start_url !== "/" || manifest.scope !== "/") {
  errors.push("manifest id/start_url/scope must all stay '/' (install identity)");
}

function pngSize(buf) {
  // PNG IHDR: width at byte 16, height at byte 20 (big endian)
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

for (const icon of manifest.icons ?? []) {
  const key = `${icon.src}|${icon.purpose}`;
  if (seen.has(key)) errors.push(`duplicate icon declaration: ${key}`);
  seen.add(key);

  const file = path.join(publicDir, icon.src.replace(/^\//, ""));
  try {
    statSync(file);
  } catch {
    errors.push(`missing icon file: ${icon.src}`);
    continue;
  }
  const buf = readFileSync(file);
  const [w, h] = pngSize(buf);
  const [dw, dh] = icon.sizes.split("x").map(Number);
  if (w !== dw || h !== dh) {
    errors.push(`${icon.src} is ${w}x${h} but declared ${icon.sizes}`);
  }
  if (!/\.v\d+\.png$/.test(icon.src)) {
    errors.push(`${icon.src} must use a versioned filename (…​.vN.png)`);
  }
  icon.hash = createHash("sha256").update(buf).digest("hex").slice(0, 12);
}

for (const size of ["192x192", "512x512"]) {
  const candidates = (manifest.icons ?? []).filter((icon) => icon.sizes === size);
  if (candidates.length !== 1 || candidates[0]?.purpose !== "any") {
    errors.push(`${size} must have exactly one stable 'any' icon candidate`);
  }
}

if (errors.length) {
  console.error("PWA icon check failed:\n - " + errors.join("\n - "));
  process.exit(1);
}

console.log(
  "PWA icon check OK:\n" +
    (manifest.icons ?? [])
      .map((i) => `  ${i.src} ${i.sizes} ${i.purpose} sha256:${i.hash}`)
      .join("\n"),
);
