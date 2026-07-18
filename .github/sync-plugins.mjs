import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const sourceDir = path.join(projectRoot, 'static', 'plugins');
const targetDir = path.join(projectRoot, 'docs', 'plugins');

const minifyResult = spawnSync(process.execPath, [path.join(scriptDir, 'minify-theme.mjs')], {
    cwd: projectRoot,
    encoding: 'utf8'
});
if (minifyResult.status !== 0) {
    throw minifyResult.error || new Error(minifyResult.stderr || minifyResult.stdout || '主题压缩失败');
}
process.stdout.write(minifyResult.stdout);

await mkdir(targetDir, { recursive: true });

const files = (await readdir(sourceDir))
    .filter((name) => name.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b));

if (!files.length) {
    throw new Error(`没有找到插件 JS：${sourceDir}`);
}

function checkSyntax(filePath) {
    const result = spawnSync(process.execPath, ['--check', filePath], {
        cwd: projectRoot,
        encoding: 'utf8'
    });
    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout || `${filePath} 语法检查失败`);
    }
}

function sha256(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

for (const name of files) {
    const source = path.join(sourceDir, name);
    const target = path.join(targetDir, name);
    checkSyntax(source);
    await copyFile(source, target);

    const [sourceBytes, targetBytes] = await Promise.all([
        readFile(source),
        readFile(target)
    ]);
    if (sha256(sourceBytes) !== sha256(targetBytes)) {
        throw new Error(`${name} 同步后哈希不一致`);
    }
}

console.log(`已检查并同步 ${files.length} 个插件 JS 到 docs/plugins。`);
