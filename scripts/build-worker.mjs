// maplibre-gl v6 は Web Worker を別ファイルで配布し、その URL を自身の
// `import.meta.url` から組み立てる。バンドラを通すとこの値はビルド時に畳み込まれ
// （Rspack なら file:// パス、Vite なら事前バンドル先）、worker の実ファイルは
// どこにも出力されないため解決に失敗する。しかも失敗しても例外は飛ばず、
// `new Worker("")` などが黙って作られてタイルが永久に届かなくなる。
// `new Worker(<変数>)` はどのバンドラも静的解析できないので、利用者側のバンドラ設定
// では埋められない。
//
// そこで worker を依存ごと 1 ファイルに束ねて本パッケージに同梱し、
// workerBootstrap.ts から `new URL('./...', import.meta.url)` で参照する。この形なら
// webpack / Rspack / Vite のいずれもアセット参照として認識し、実ファイルを出力した
// うえで URL を書き換えてくれる。
//
// 束ねるのは worker 本体が `./maplibre-gl-shared.mjs` を相対 import しているため。
// アセットとして出力されるのは参照された 1 ファイルだけで、その中の相対 import までは
// 追ってくれないので、自己完結させておく必要がある。
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const outDir = join(import.meta.dirname, '..', 'dist', 'generated');
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs')],
  outfile: join(outDir, 'maplibre-worker.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
  // BSD-3-Clause の表示義務があるのでライセンスコメントは残す
  legalComments: 'inline',
});

console.log('dist/generated/maplibre-worker.mjs written');
