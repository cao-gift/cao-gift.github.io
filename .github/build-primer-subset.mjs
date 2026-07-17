import { brotliDecompressSync } from 'node:zlib';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const compressedSource = path.join(scriptDir, 'assets', 'primer-source.css.br');
const expectedSourceSha256 = '404285d607d08a47cfc32d849d85f2aec7ec71c278f6f9befdb05fd390591521';
const tempDir = path.join(root, 'primer-output.tmp');
const sourcePath = path.join(root, 'primer-source.tmp.css');

try {
    const source = brotliDecompressSync(await readFile(compressedSource));
    const actualSha256 = createHash('sha256').update(source).digest('hex');
    if (actualSha256 !== expectedSourceSha256) {
        throw new Error(`Primer source hash mismatch: ${actualSha256}`);
    }

    const outputDir = tempDir;
    await writeFile(sourcePath, source);
    await mkdir(outputDir, { recursive: true });

    const purgeArgs = [
        '--yes',
        'purgecss@8.0.0',
        '--css', path.relative(root, sourcePath),
        '--content', 'docs/**/*.html', 'static/plugins/*.js',
        '--variables',
        '--keyframes',
        '--font-face',
        '--output', path.relative(root, outputDir),
    ];
    const result = process.platform === 'win32'
        ? spawnSync(
            process.env.ComSpec || 'cmd.exe',
            ['/d', '/s', '/c', ['npx', ...purgeArgs].join(' ')],
            { cwd: root, encoding: 'utf8' },
        )
        : spawnSync('npx', purgeArgs, { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) {
        throw result.error || new Error(result.stderr || result.stdout || 'PurgeCSS failed');
    }

    const generated = path.join(outputDir, path.basename(sourcePath));
    const sourceTarget = path.join(root, 'static', 'plugins', 'primer.css');
    const docsTarget = path.join(root, 'docs', 'plugins', 'primer.css');
    await copyFile(generated, sourceTarget);
    await copyFile(generated, docsTarget);

    const bytes = await readFile(generated);
    console.log(`Primer subset built: ${source.length} -> ${bytes.length} bytes`);
} finally {
    await rm(tempDir, { recursive: true, force: true });
    await rm(sourcePath, { force: true });
}
