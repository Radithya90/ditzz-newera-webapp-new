import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const publicExtensions = new Set(['.css', '.html', '.js']);

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || !publicExtensions.has(path.extname(entry.name))) continue;
    fs.copyFileSync(path.join(root, entry.name), path.join(output, entry.name));
}

const adminSource = path.join(root, 'admin');
const adminOutput = path.join(output, 'admin');
fs.mkdirSync(adminOutput, { recursive: true });
for (const entry of fs.readdirSync(adminSource, { withFileTypes: true })) {
    if (!entry.isFile() || path.extname(entry.name) !== '.html') continue;
    fs.copyFileSync(path.join(adminSource, entry.name), path.join(adminOutput, entry.name));
}

console.log(`Built Cloudflare Pages assets in ${path.relative(root, output)}.`);
