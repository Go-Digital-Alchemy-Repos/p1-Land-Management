import { readFile, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/assets');
const manifest = JSON.parse(await readFile(path.join(root, 'image-manifest.json'), 'utf8'));
const failures = [];
async function checkCoverage(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'optimized') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await checkCoverage(file);
    else if (/\.(png|jpe?g)$/i.test(entry.name)) {
      const key = path.relative(root, file).split(path.sep).join('/');
      if (!manifest[key]) failures.push(`${key}: missing generated variants`);
    }
  }
}
await checkCoverage(root);
let originals = 0, defaults = 0;
for (const [source, image] of Object.entries(manifest)) {
  const bytes = await readFile(path.join(root, source));
  if (createHash('sha256').update(bytes).digest('hex') !== image.sourceHash) failures.push(`${source}: source changed; regenerate variants`);
  originals += bytes.length;
  defaults += (await stat(path.join(root, image.default))).size;
  for (const variant of image.variants) {
    const actual = (await stat(path.join(root, variant.path))).size;
    const limit = variant.width <= 768 ? 100_000 : 250_000;
    if (actual > limit) failures.push(`${variant.path}: ${actual} bytes exceeds ${limit}`);
    if (actual !== variant.bytes) failures.push(`${variant.path}: manifest size is stale`);
  }
}
console.log(`${Object.keys(manifest).length} images: originals ${(originals / 1e6).toFixed(2)} MB; default WebP ${(defaults / 1e6).toFixed(2)} MB (${(100 * (1 - defaults / originals)).toFixed(1)}% reduction).`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('All generated image variants pass their image budgets. Page transfer and JavaScript budgets must be checked separately.');
