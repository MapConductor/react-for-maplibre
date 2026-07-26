[English](https://github.com/MapConductor/react-for-maplibre/README.md) | [日本語](https://github.com/MapConductor/react-for-maplibre/README.ja.md) | Español (Latinoamérica)

# @mapconductor/react-for-maplibre

Proveedor de MapLibre GL JS para el SDK de React de MapConductor. Renderiza un mapa de MapLibre a través de la API de cámara, marcadores y superposiciones independiente del proveedor de MapConductor, de modo que el mismo código de aplicación también puede ejecutarse en Google Maps, Mapbox, Leaflet, OpenLayers, ArcGIS, Cesium o HERE.

## Instalación

```shell
npm install @mapconductor/react-for-maplibre
```

`@mapconductor/js-sdk-core` y `@mapconductor/js-sdk-react` (usados para marcadores y otros componentes compartidos) se instalan automáticamente como dependencias. Tu código importa directamente de ambos, así que con el `node_modules` estricto (aislado) de pnpm — o siempre que prefieras declarar todo lo que importas — instálalos explícitamente:

```shell
npm install @mapconductor/react-for-maplibre @mapconductor/js-sdk-core @mapconductor/js-sdk-react
```

`maplibre-gl` (v6) viene incluido como dependencia; no se requiere clave de API para los estilos integrados de OpenStreetMap Japan.

## Configuración del empaquetador (MapLibre GL JS v6)

MapLibre GL JS v6 es solo ESM y carga su Web Worker desde una URL. Con un
empaquetador (Vite, webpack, esbuild, Rollup) esa URL debe registrarse una vez,
antes de crear el primer mapa. Este paquete reexporta `setWorkerUrl` de maplibre
como `setMapLibreWorkerUrl` para que puedas hacerlo sin importar `maplibre-gl`
directamente:

```ts
// Vite
import { setMapLibreWorkerUrl } from '@mapconductor/react-for-maplibre';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setMapLibreWorkerUrl(workerUrl);
```

```ts
// webpack 5+ / esbuild / Rollup (después de copiar el worker junto a tu bundle)
import { setMapLibreWorkerUrl } from '@mapconductor/react-for-maplibre';

setMapLibreWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
```

Para SSR con Vite, agrega `maplibre-gl` a `ssr.noExternal` para que el import de
la URL del worker se resuelva a través de Vite. Consulta la
[guía de migración v5→v6](https://github.com/maplibre/maplibre-gl-js/blob/v6.0.0/docs/guides/v5-to-v6-migration-guide.md)
para más detalles por empaquetador.

![](https://raw.githubusercontent.com/mapconductor/react-for-maplibre/docs/images/hello-map.jpg)

## Tutorial Hello Map

La aplicación de mapa más sencilla posible, creada con MapConductor + MapLibre: haz clic en el marcador y aparecerá un globo "Hello, MapConductor". Puedes crear este mapa en los 5 pasos siguientes. Usa MapLibre, que no requiere clave de API, así que puedes copiar y pegar y funciona.

### Paso 1: Crea un proyecto React

Crea un proyecto React + TypeScript con Vite.

```shell
npm create vite@latest hello-map -- --template react-ts
cd hello-map
npm install
npm run dev
```

### Paso 2: Instala MapConductor (MapLibre)

Instala el paquete necesario para mostrar un mapa. Aquí usamos MapLibre, pero también puedes usar otros módulos de mapas.

```shell
npm install @mapconductor/react-for-maplibre
```

- `@mapconductor/react-for-maplibre` — componentes / hooks para MapLibre
- `@mapconductor/js-sdk-react` / `@mapconductor/js-sdk-core` se instalan
  automáticamente como dependencias.

### Paso 3: Muestra el mapa

Crea el estado del mapa con `useMapLibreViewState` y renderízalo con `<MapLibreMapView>`. No olvides el import del CSS de estilos. Da una altura al elemento externo para que ocupe toda la pantalla.

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

### Paso 4: Coloca un marcador

Crea el estado del marcador con `createMarkerState` y regístralo con `<Marker>`. Escribe las superposiciones como **elementos hijos** del componente del mapa.

```tsx
import { useMemo } from 'react';
import { createMarkerState } from '@mapconductor/js-sdk-core';
import { Marker } from '@mapconductor/js-sdk-react';

// ...dentro de App...
const marker = useMemo(
  () => createMarkerState({ id: 'hello', position: TOKYO }),
  [],
);

// ...dentro de return...
<MapLibreMapView state={mapViewState}>
  <Marker state={marker} />
</MapLibreMapView>
```

### Paso 5: Muestra un InfoBubble al hacer clic

Guarda el estado de selección con `useState`, ponlo en true en el `onClick` del marcador y renderiza `<InfoBubble>` solo mientras está seleccionado. Este es el resultado final.

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

### Puntos clave

- Las coordenadas, cámaras y marcadores se crean con funciones de `js-sdk-core`
  (**independiente del proveedor**).
- El componente del mapa y los hooks vienen de `react-for-maplibre`
  (**específico del proveedor**).
- Escribe las superposiciones como **elementos hijos** del componente del mapa.
- Controla mostrar / ocultar con `useState` de React.

## Paquetes relacionados

- [`@mapconductor/js-sdk-core`](https://github.com/mapconductor/js-sdk-core) — primitivas de geometría, cámara y estado
- [`@mapconductor/js-sdk-react`](https://github.com/mapconductor/js-sdk-react) — `Marker`, `Markers`, formas y burbujas de información compartidos
