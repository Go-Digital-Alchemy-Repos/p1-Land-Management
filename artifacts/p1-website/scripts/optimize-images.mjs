import { readdir, mkdir, writeFile, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/assets');
const sharp = (await import(process.env.SHARP_MODULE ? pathToFileURL(process.env.SHARP_MODULE).href : 'sharp')).default;
const widths = [480, 768, 1280, 1920];
const manifest = {};
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'optimized') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (/\.(png|jpe?g)$/i.test(file)) files.push(file);
  }
  return files.sort();
}
for (const file of await walk(root)) {
  const original = path.relative(root, file).replaceAll(path.sep, '/');
  const stem = original.replace(/\.[^.]+$/, '');
  const input = await readFile(file);
  const metadata = await sharp(input).metadata();
  const variants = [];
  for (const width of widths.filter((value, index) => value <= metadata.width || index === 0)) {
    for (const format of ['webp', 'avif']) {
      const relative = `optimized/${stem}-${width}.${format}`;
      const output = path.join(root, relative);
      await mkdir(path.dirname(output), { recursive: true });
      const budget = width <= 768 ? 100_000 : 250_000;
      let quality = format === 'webp' ? 78 : 58;
      let result;
      do {
        result = await sharp(input).keepXmp().rotate().resize({ width, withoutEnlargement: true })
          [format]({ quality, effort: format === 'avif' ? 5 : 5 }).toBuffer({ resolveWithObject: true });
        if (result.data.length <= budget || quality <= 35) break;
        quality -= 5;
      } while (true);
      await writeFile(output, result.data);
      variants.push({ path: relative, format, width: result.info.width, height: result.info.height, bytes: result.info.size, quality });
    }
  }
  const defaultImage = variants.filter(v => v.format === 'webp' && v.width <= 1280).at(-1);
  manifest[original] = {
    sourceBytes: (await stat(file)).size,
    sourceHash: createHash('sha256').update(input).digest('hex'),
    width: metadata.width, height: metadata.height,
    default: defaultImage.path, variants,
  };
  process.stdout.write(`Optimized ${original}\n`);
}
await writeFile(path.join(root, 'image-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated modern image variants for ${Object.keys(manifest).length} preserved originals.`);
