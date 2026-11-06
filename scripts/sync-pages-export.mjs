import { cp, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'out');
const entries = await readdir(output, { withFileTypes: true });

for (const entry of entries) {
  const target = path.join(root, entry.name);
  await rm(target, { recursive: true, force: true });
  await cp(path.join(output, entry.name), target, { recursive: true, force: true });
}

// GitHub Pages runs Jekyll for branch-based sites by default. This marker makes
// it serve Next.js' underscore-prefixed `_next` assets without filtering them.
await writeFile(path.join(root, '.nojekyll'), '');

console.log(`Synced ${entries.length} static export entries and .nojekyll to the GitHub Pages document root.`);
