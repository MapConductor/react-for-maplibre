import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Vite の dev サーバーは node_modules 配下の `.mjs` もモジュールとして変換し、
// 動的 import を見つけると `/@vite/client` からの import を注入する。maplibre の
// worker には `importScriptInWorkers` 用の動的 import があるため注入対象になり、
// 注入されたコードは worker 内では動作しないので worker が壊れる。
//
// このプラグインは、同梱 worker へのリクエストを Vite のモジュールパイプラインに
// 入る前に横取りし、ファイルをそのまま返す。本番ビルドでは Vite が worker を
// アセットとして出力するだけで変換は挟まないため、dev のみ有効にしている。

/** リクエストパスの末尾がこれなら同梱 worker への要求とみなす。 */
const WORKER_PATH_SUFFIX = 'dist/generated/maplibre-worker.mjs';

/**
 * このファイルが置かれているディレクトリ。cjs / esm の両方でビルドされるため、
 * 実行時に存在する方を使う。esm 出力に `__dirname` は無く、cjs 出力の
 * `import.meta` は空になるので、どちらか一方だけでは足りない。
 */
function moduleDir(): string {
  return typeof __dirname !== 'undefined'
    ? __dirname
    : fileURLToPath(new URL('.', import.meta.url));
}

/** Vite の Plugin 型を構造的に表現する。`vite` への依存を持たないため。 */
interface ServerResponseLike {
  setHeader(name: string, value: string): void;
}

interface ViteDevServerLike {
  middlewares: {
    use(fn: (req: { url?: string }, res: ServerResponseLike, next: () => void) => void): void;
  };
}

export interface MapConductorPluginLike {
  name: string;
  apply: 'serve';
  configureServer(server: ViteDevServerLike): void;
}

/**
 * 同梱 worker が Vite の dev サーバーで壊れないようにする。
 *
 * ```ts
 * // vite.config.ts
 * import mapconductor from '@mapconductor/react-for-maplibre/vite';
 * export default { plugins: [react(), mapconductor()] };
 * ```
 */
export function mapconductor(): MapConductorPluginLike {
  const workerFile = join(moduleDir(), 'generated', 'maplibre-worker.mjs');

  return {
    name: 'mapconductor:maplibre-worker',
    // 本番ビルドは変換が挟まらないので dev だけで足りる。
    apply: 'serve',
    configureServer(server) {
      // configureServer は Vite の内部ミドルウェアより先に登録されるため、
      // 変換パイプラインに入る前に横取りできる。
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (!path.endsWith(WORKER_PATH_SUFFIX)) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'text/javascript');
        // 開発中に worker を差し替えることはないので長期キャッシュで良い。
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(workerFile).pipe(res as unknown as NodeJS.WritableStream);
      });
    },
  };
}

export default mapconductor;
