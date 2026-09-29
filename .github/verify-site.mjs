// The same check runs before GitHub Pages upload and EdgeOne Git deployment.
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const config = JSON.parse(await readFile(path.join(root, 'config.json'), 'utf8'));
const textual = /\.(?:html|js|mjs|css|json|webmanifest|xml|txt|yml|yaml)$/i;
async function digest(filename) {
    const bytes = await readFile(filename);
    const value = textual.test(filename) ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes;
    return createHash('sha256').update(value).digest('hex');
}
async function inventory(directory) {
    const result = {};
    async function visit(current) {
        for (const entry of await readdir(current, { withFileTypes: true })) {
            const filename = path.join(current, entry.name);
            if (entry.isDirectory()) await visit(filename);
            else if (entry.isFile()) result[path.relative(directory, filename).replaceAll('\\', '/')] = await digest(filename);
        }
    }
    await visit(directory);
    return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b, 'en')));
}
const required = ['index.html', 'tag.html', 'postList.json', 'rss.xml', 'robots.txt', 'sitemap.xml', '404.html'];
if (config.archivePage) required.push('archive.html');
if (config.pwa) required.push('manifest.webmanifest', 'sw.js');
for (const label of config.singlePage || []) required.push(`${label}.html`);
for (const relative of required) {
    const filename = path.resolve(docs, relative);
    if (!filename.startsWith(docs + path.sep)) throw new Error(`Invalid page path: ${relative}`);
    if (!(await stat(filename).catch(() => null))?.size) {
        throw new Error(`Missing generated page: ${relative}. Check its open, labelled Issue and rebuild the site.`);
    }
}
const sourceAssets = await inventory(path.join(root, 'static'));
const files = await inventory(docs);
delete files['build.json'];
for (const [relative, hash] of Object.entries(sourceAssets)) {
    if (files[relative] !== hash) throw new Error(`Source/output asset mismatch: static/${relative} -> docs/${relative}`);
}
const source = { config: await digest(path.join(root, 'config.json')), static: sourceAssets };
const sourceDigest = createHash('sha256').update(JSON.stringify(source)).digest('hex');
const buildId = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 20);
const manifestPath = path.join(docs, 'build.json');
if (process.argv.includes('--write')) {
    const sourceRevision = process.env.SOURCE_REVISION || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const generatorRevision = process.env.GMEEK_GENERATOR_SHA || config.GMEEK_VERSION;
    if (!/^[a-f0-9]{40}$/.test(generatorRevision)) throw new Error('Pin GMEEK_VERSION to a verified generator commit SHA.');
    if (generatorRevision !== config.GMEEK_VERSION) throw new Error('Generator checkout differs from pinned GMEEK_VERSION.');
    const manifest = { schemaVersion: 1, buildId, sourceRevision, generatorRevision, sourceDigest, hashMode: 'sha256-text-lf', files };
    const previous = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => 'null'));
    // Keep no-op builds from creating a new commit just for sourceRevision.
    const unchanged = previous?.buildId === buildId && previous?.sourceDigest === sourceDigest
        && previous?.generatorRevision === generatorRevision && JSON.stringify(previous.files) === JSON.stringify(files);
    if (!unchanged) await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
} else {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => { throw new Error('No build.json: wait for the Gmeek build commit before deploying.'); }));
    if (manifest.sourceDigest !== sourceDigest || manifest.generatorRevision !== config.GMEEK_VERSION) {
        throw new Error('Generated site is older than config/static sources. Deploy the Gmeek build commit, not the source-only commit.');
    }
    if (manifest.buildId !== buildId || JSON.stringify(manifest.files) !== JSON.stringify(files)) {
        throw new Error('Generated site differs from build.json; rebuild before deploying.');
    }
}
console.log(`Verified site ${buildId}: ${Object.keys(files).length} files; ${required.length} required outputs.`);
