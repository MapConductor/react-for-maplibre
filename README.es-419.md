[English](https://github.com/MapConductor/react-for-maplibre/blob/main/README.md) | [日本語](https://github.com/MapConductor/react-for-maplibre/blob/main/README.ja.md) | Español (Latinoamérica)

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

## Web Worker (MapLibre GL JS v6)

No requiere configuración. MapLibre GL JS v6 carga su Web Worker desde una URL
que ningún empaquetador puede resolver por sí solo, por lo que este paquete
incluye una compilación autocontenida de ese worker y la registra al crear el
primer mapa.

Dos excepciones:

- **Servidor de desarrollo de Vite.** Agrega el plugin incluido en este paquete:

  ```ts
  // vite.config.ts
  import mapconductor from '@mapconductor/react-for-maplibre/vite';

  export default defineConfig({ plugins: [react(), mapconductor()] });
  ```

  El servidor de desarrollo de Vite transforma los archivos `.mjs` dentro de
  `node_modules` como módulos e inyecta un import de `/@vite/client`, que no
  puede ejecutarse dentro de un worker. El plugin sirve el worker incluido antes
  de esa transformación. Usa `apply: 'serve'`, así que las compilaciones de
  producción no se ven afectadas y funcionan sin él.

- **Servir el worker desde tu propia URL** (una CDN compartida, o una compilación
  que ya lo emite). Llama a `setMapLibreWorkerUrl(url)` antes del primer mapa;
  el worker incluido se omite y nunca se descarga.

Si el worker no carga, MapLibre no lanza ningún error: el mapa dibuja su fondo y
los tiles nunca llegan. Cero solicitudes `.pbf` en el panel de red es el síntoma.

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
