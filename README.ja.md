[English](https://github.com/MapConductor/react-for-maplibre/blob/main/README.md) | 日本語 | [Español (Latinoamérica)](https://github.com/MapConductor/react-for-maplibre/blob/main/README.es-419.md)

# @mapconductor/react-for-maplibre

MapConductor React SDK の MapLibre GL JS プロバイダです。MapConductor のプロバイダ非依存なカメラ・マーカー・オーバーレイ API を通じて MapLibre の地図を描画するため、同じアプリケーションコードが Google Maps、Mapbox、Leaflet、OpenLayers、ArcGIS、Cesium、HERE でもそのまま動作します。

## インストール

```shell
npm install @mapconductor/react-for-maplibre
```

`@mapconductor/js-sdk-core` と `@mapconductor/js-sdk-react`(マーカーなどの共有コンポーネントで使用)は依存関係として自動的にインストールされます。ただしアプリケーションコードはこの2つから直接 import するため、pnpm の strict(isolated)な `node_modules` を使う場合や、import するものをすべて明示的に宣言したい場合は、次のように明示的にインストールしてください:

```shell
npm install @mapconductor/react-for-maplibre @mapconductor/js-sdk-core @mapconductor/js-sdk-react
```

`maplibre-gl`（v6）は依存関係として同梱されています。組み込みの OpenStreetMap Japan スタイルに API キーは不要です。

## バンドラー設定（MapLibre GL JS v6）

MapLibre GL JS v6 は ESM 専用となり、Web Worker を URL から読み込みます。バンドラー
（Vite、webpack、esbuild、Rollup）を使う場合は、最初の地図を生成する前に一度だけその
URL を登録する必要があります。本パッケージは maplibre の `setWorkerUrl` を
`setMapLibreWorkerUrl` として再エクスポートしているため、`maplibre-gl` を直接
import せずに設定できます。

```ts
// Vite
import { setMapLibreWorkerUrl } from '@mapconductor/react-for-maplibre';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setMapLibreWorkerUrl(workerUrl);
```

```ts
// webpack 5+ / esbuild / Rollup（worker をバンドル横にコピーした後）
import { setMapLibreWorkerUrl } from '@mapconductor/react-for-maplibre';

setMapLibreWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
```

Vite で SSR を使う場合は、worker の URL import が Vite 経由で解決されるよう
`ssr.noExternal` に `maplibre-gl` を追加してください。詳細は
[v5→v6 移行ガイド](https://github.com/maplibre/maplibre-gl-js/blob/v6.0.0/docs/guides/v5-to-v6-migration-guide.md)
を参照してください。

![](https://raw.githubusercontent.com/mapconductor/react-for-maplibre/docs/images/hello-map.jpg)

## Hello Map チュートリアル

MapConductor + MapLibre で作る、いちばん簡単な地図アプリです。マーカーをクリックすると「Hello, MapConductor」の吹き出しが出ます。この地図は、次の 5 ステップで作れます。API キー不要の MapLibre を使うので、コピペで動きます。

### ステップ 1: React プロジェクトを作る

Vite で React + TypeScript のプロジェクトを作成します。

```shell
npm create vite@latest hello-map -- --template react-ts
cd hello-map
npm install
npm run dev
```

### ステップ 2: MapConductor（MapLibre）をインストール

地図表示に必要なパッケージを入れます。ここでは MapLibre を使いますが、他の地図モジュールを使うこともできます。

```shell
npm install @mapconductor/react-for-maplibre
```

- `@mapconductor/react-for-maplibre` — MapLibre 用のコンポーネント/フック
- `@mapconductor/js-sdk-react` / `@mapconductor/js-sdk-core` は依存関係として自動的にインストールされます。

### ステップ 3: 地図を表示する

`useMapLibreViewState` で地図の状態を作り、`<MapLibreMapView>` で描画します。スタイル用の CSS import を忘れずに。外側の要素に高さを与えると全画面になります。

```tsx
import {
  MapLibreDesign,
  MapLibreMapView,
  useMapLibreViewState,
} from '@mapconductor/react-for-maplibre';
import '@mapconductor/react-for-maplibre/style.css';
import { createGeoPoint, createMapCameraPosition } from '@mapconductor/js-sdk-core';

const TOKYO = createGeoPoint({ latitude: 35.6812, longitude: 139.7671 });
const INITIAL_CAMERA = createMapCameraPosition({ position: TOKYO, zoom: 14 });

export default function App() {
  const mapViewState = useMapLibreViewState({
    mapDesignType: MapLibreDesign.OsmBright,
    cameraPosition: INITIAL_CAMERA,
  });

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MapLibreMapView state={mapViewState} />
    </div>
  );
}
```

### ステップ 4: マーカーを置く

`createMarkerState` でマーカーの状態を作り、`<Marker>` で登録します。オーバーレイは地図コンポーネントの**子要素**として書きます。

```tsx
import { useMemo } from 'react';
import { createMarkerState } from '@mapconductor/js-sdk-core';
import { Marker } from '@mapconductor/js-sdk-react';

// ...App の中...
const marker = useMemo(
  () => createMarkerState({ id: 'hello', position: TOKYO }),
  [],
);

// ...return の中...
<MapLibreMapView state={mapViewState}>
  <Marker state={marker} />
</MapLibreMapView>
```

### ステップ 5: クリックで InfoBubble を表示する

選択中かどうかを `useState` で持ち、マーカーの `onClick` で true にします。選択中のときだけ `<InfoBubble>` を描画します。これが完成形です。

```tsx
import { useMemo, useState } from 'react';
import {
  MapLibreDesign,
  MapLibreMapView,
  useMapLibreViewState,
} from '@mapconductor/react-for-maplibre';
import '@mapconductor/react-for-maplibre/style.css';
import {
  createGeoPoint,
  createMapCameraPosition,
  createMarkerState,
} from '@mapconductor/js-sdk-core';
import { InfoBubble, Marker } from '@mapconductor/js-sdk-react';

const TOKYO = createGeoPoint({ latitude: 35.6812, longitude: 139.7671 });
const INITIAL_CAMERA = createMapCameraPosition({ position: TOKYO, zoom: 14 });

export default function App() {
  const mapViewState = useMapLibreViewState({
    mapDesignType: MapLibreDesign.OsmBright,
    cameraPosition: INITIAL_CAMERA,
  });

  const [selected, setSelected] = useState(false);

  const marker = useMemo(
    () => createMarkerState({
      id: 'hello',
      position: TOKYO,
      onClick: () => setSelected(true),
    }),
    [],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MapLibreMapView state={mapViewState} onMapClick={() => setSelected(false)}>
        <Marker state={marker} />
        {selected && (
          <InfoBubble marker={marker}>
            <div style={{ padding: '8px 12px', fontWeight: 600 }}>
              Hello, MapConductor
            </div>
          </InfoBubble>
        )}
      </MapLibreMapView>
    </div>
  );
}
```

### ポイント

- 座標・カメラ・マーカーは `js-sdk-core` の関数で作る（**プロバイダー非依存**）
- 地図コンポーネントとフックは `react-for-maplibre` から来る（**プロバイダー固有**）
- オーバーレイは地図コンポーネントの**子要素**として書く
- 表示・非表示は React の `useState` で制御する

## 関連パッケージ

- [`@mapconductor/js-sdk-core`](https://github.com/mapconductor/js-sdk-core) — ジオメトリ・カメラ・状態のプリミティブ
- [`@mapconductor/js-sdk-react`](https://github.com/mapconductor/js-sdk-react) — 共有の `Marker`・`Markers`・シェイプ・インフォバブル
