// Bundles the client into one self-contained HTML file: dist/index.html
// Usage: node tools/build.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';

const r = await build({
  entryPoints: ['src/client/main.ts'],
  bundle: true, minify: true, format: 'iife', target: 'es2020', write: false,
  // PROFILE=1: readable function names for the CPU profiler (tools/perf120.mjs)
  ...(process.env.PROFILE ? { minifyIdentifiers: false, keepNames: true } : {}),
});
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = readFileSync('src/client/index.html', 'utf8').replace('<script>/*BUNDLE*/</script>', () => `<script>${js}</script>`);
const out = process.env.PROFILE ? 'dist-prof' : 'dist';
mkdirSync(out, { recursive: true });
writeFileSync(out + '/index.html', html);
if (process.env.PROFILE) { for (const d of ['h3d', 'wall', 'ev', 'entry', 'floors']) if (existsSync('assets/' + d)) cpSync('assets/' + d, out + '/' + d, { recursive: true }); console.log(out); process.exit(0); }
// 3D hero atlases (правка 102) stay separate files next to index.html
rmSync('dist/h3d', { recursive: true, force: true }); // stale atlases go away with their sources (правка 104)
if (existsSync('assets/h3d')) cpSync('assets/h3d', 'dist/h3d', { recursive: true });
// wall map backgrounds and the wall itself (правки 112, 115)
rmSync('dist/wall', { recursive: true, force: true });
if (existsSync('assets/wall')) cpSync('assets/wall', 'dist/wall', { recursive: true });
// event arena floors (правки 125, 126)
rmSync('dist/ev', { recursive: true, force: true });
if (existsSync('assets/ev')) cpSync('assets/ev', 'dist/ev', { recursive: true });
// stage floors (правка 167)
rmSync('dist/floors', { recursive: true, force: true });
if (existsSync('assets/floors')) cpSync('assets/floors', 'dist/floors', { recursive: true });
// entry screen: background, heroes, logos in 10 languages (правка 170)
rmSync('dist/entry', { recursive: true, force: true });
if (existsSync('assets/entry')) cpSync('assets/entry', 'dist/entry', { recursive: true });
// Orb Defense art (backgrounds, walls, spirits, enemies, books, runes)
rmSync('dist/orb', { recursive: true, force: true });
if (existsSync('assets/orb')) cpSync('assets/orb', 'dist/orb', { recursive: true });
console.log('dist/index.html', (html.length / 1024).toFixed(1), 'KB');
