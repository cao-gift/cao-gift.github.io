// Validate a standalone docs/ deployment. No files outside the project root are needed.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'build.json'), 'utf8'));
if (manifest.schemaVersion !== 1 || manifest.hashMode !== 'sha256-text-lf'
    || !/^[a-f0-9]{40}$/.test(manifest.generatorRevision)
    || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    throw new Error('Invalid release manifest; rebuild with Gmeek before deploying.');
}
const required = ['index.html', 'about.html', 'link.html', 'tag.html', 'archive.html',
    'postList.json', 'rss.xml', 'robots.txt', 'sitemap.xml', '404.html',
    'manifest.webmanifest', 'sw.js', 'edgeone.json', 'verify-release.mjs'];
for (const relative of required) {
    if (!Object.hasOwn(manifest.files, relative)) throw new Error(`Required release file is missing: ${relative}`);
}
const textual = /\.(?:html|js|mjs|css|json|webmanifest|xml|txt|yml|yaml)$/i;
// Hosting tools may create their own metadata in the build directory. Validate
// the exact files produced by Gmeek, independently of that build-time metadata.
for (const [relative, expected] of Object.entries(manifest.files)) {
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep) || relative.includes('\\') || !/^[a-f0-9]{64}$/.test(expected)) {
        throw new Error(`Invalid release entry: ${relative}`);
    }
    const bytes = await readFile(filename);
    if (!bytes.length && required.includes(relative)) throw new Error(`Empty release file: ${relative}`);
    const value = textual.test(filename) ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes;
    const actual = createHash('sha256').update(value).digest('hex');
    if (actual !== expected) throw new Error(`Release file changed: ${relative}; rebuild before deploying.`);
}
const buildId = createHash('sha256').update(JSON.stringify(manifest.files)).digest('hex').slice(0, 20);
if (manifest.buildId !== buildId) throw new Error('Release buildId does not match its file manifest.');
console.log(`Verified standalone release ${buildId}: ${Object.keys(manifest.files).length} files.`);
