import { getWorkerUrl, setWorkerUrl } from 'maplibre-gl';

// maplibre-gl v6 は Web Worker を別ファイルで配布し、その URL を自身の
// `import.meta.url` から組み立てる。バンドラを通すとこの値はビルド時に畳み込まれ
// （Rspack なら file:// パス、Vite なら事前バンドル先）、worker の実ファイルは
// どこにも出力されないため解決に失敗する。しかも失敗しても例外は飛ばず、
// `new Worker("")` などが黙って作られ、タイル要求が 1 件も出ないまま無言で止まる。
//
// 対策として、束ねた worker（scripts/build-worker.mjs が生成）を同梱し、下の
// `new URL(<文字列リテラル>, import.meta.url)` で参照する。maplibre 側の
// `new Worker(<変数>)` と違い、この形は webpack / Rspack / Vite のいずれも
// アセット参照として静的に認識し、実ファイルを出力したうえで URL を書き換える。
//
// なお worker のコードを Blob URL 化して渡す方法は maplibre v6 では動かない
// （worker 自体はエラーなく起動するが、タイル要求が 1 件も出ない）。実ファイルとして
// 配信する必要がある。

let ready = false;

/**
 * 同梱の worker を登録する。初回のみ実行される。
 *
 * 利用者が `setMapLibreWorkerUrl`（あるいは maplibre の `setWorkerUrl`）で URL を
 * 設定済みの場合は何もしない。既定値は空文字なので、それで判別できる。
 */
export function ensureMapLibreWorker(): void {
  if (ready || getWorkerUrl()) return;
  ready = true;
  setWorkerUrl(new URL('./generated/maplibre-worker.mjs', import.meta.url).href);
}
