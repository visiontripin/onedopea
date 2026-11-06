import { cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'out');
const entries = await readdir(output, { withFileTypes: true });

for (const entry of entries) {
  await cp(path.join(output, entry.name), path.join(root, entry.name), { recursive: true, force: true });
}

console.log(`Synced ${entries.length} static export entries from out/ to the GitHub Pages document root.`);
