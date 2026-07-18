import { stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const pluginDir = path.join(projectRoot, 'static', 'plugins');
const terserVersion = '5.44.0';
const bundles = [
    ['Theme.js', 'Theme.min.js'],
    ['ThemeRuntime.js', 'ThemeRuntime.min.js'],
];

function runTerser(input, output) {
    const args = [
        '--yes',
        `terser@${terserVersion}`,
        input,
        '--compress', 'passes=2',
        '--mangle',
        '--ecma', '2020',
        '--output', output,
    ];
    const result = process.platform === 'win32'
        ? spawnSync(
            process.env.ComSpec || 'cmd.exe',
            ['/d', '/s', '/c', ['npx', ...args].join(' ')],
            { cwd: projectRoot, encoding: 'utf8' },
        )
        : spawnSync('npx', args, { cwd: projectRoot, encoding: 'utf8' });
    if (result.status !== 0) {
        throw result.error || new Error(result.stderr || result.stdout || `${input} 压缩失败`);
    }
}

for (const [sourceName, targetName] of bundles) {
    const source = path.join(pluginDir, sourceName);
    const target = path.join(pluginDir, targetName);
    runTerser(source, target);
    const [sourceInfo, targetInfo] = await Promise.all([stat(source), stat(target)]);
    if (!targetInfo.size || targetInfo.size >= sourceInfo.size) {
        throw new Error(`${targetName} 未获得有效压缩结果`);
    }
    console.log(`${sourceName}: ${sourceInfo.size} -> ${targetInfo.size} bytes`);
}
