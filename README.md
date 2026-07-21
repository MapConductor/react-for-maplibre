English | [日本語](./README.ja.md) | [Español (Latinoamérica)](./README.es-419.md)

# @mapconductor/react-for-maplibre

MapLibre GL JS provider for the MapConductor React SDK. Renders a MapLibre map
through MapConductor's provider-independent camera, marker, and overlay API, so
the same application code can also run on Google Maps, Mapbox, Leaflet,
OpenLayers, ArcGIS, Cesium, or HERE.

## Installation

```shell
npm install @mapconductor/react-for-maplibre
```

`@mapconductor/js-sdk-core` and `@mapconductor/js-sdk-react` (used for markers and
other shared components) are installed automatically as dependencies. Your
code imports from both directly, so with pnpm's strict (isolated)
`node_modules` — or whenever you prefer to declare everything you import —
install them explicitly instead:

```shell
npm install @mapconductor/react-for-maplibre @mapconductor/js-sdk-core @mapconductor/js-sdk-react
```

`maplibre-gl` is bundled as a dependency; no API key is required for the
built-in OpenStreetMap Japan styles.

## Quick start

```tsx
import { createGeoPoint, createMapCameraPosition } from '@mapconductor/js-sdk-core';
import { Marker } from '@mapconductor/js-sdk-react';
import {
  MapLibreDesign,
  MapLibreMapView2D,
  useMapLibreViewState,
} from '@mapconductor/react-for-maplibre';
import '@mapconductor/react-for-maplibre/style.css';

const TOKYO = createGeoPoint({ latitude: 35.6812, longitude: 139.7671 });

export function App() {
  const state = useMapLibreViewState({
    mapDesignType: MapLibreDesign.OsmBrightJa,
    cameraPosition: createMapCameraPosition({ position: TOKYO, zoom: 12 }),
  });

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <MapLibreMapView2D
        state={state}
        onMapClick={point => console.log('clicked', point.latitude, point.longitude)}
        onCameraMoveEnd={camera => console.log('zoom', camera.zoom)}
      >
        <Marker position={TOKYO} />
      </MapLibreMapView2D>
    </div>
  );
}
```

Use `MapLibreMapView` instead of `MapLibreMapView2D` for the globe projection.

## Map designs

`MapLibreDesign` ships style presets served by openstreetmap.jp:
`OsmBright`, `OsmBrightEn`, `OsmBrightJa`, `MapTilerBasicEn`, `MapTilerBasicJa`,
`MapTilerTonerEn`, `MapTilerTonerJa`, `OpenMapTiles`, and `DemoTiles`. Switch at
runtime by assigning `state.mapDesignType = ...`.

## Related packages

- [`@mapconductor/js-sdk-core`](../js-sdk-core) — geometry, camera, and state primitives
- [`@mapconductor/js-sdk-react`](../js-sdk-react) — shared `Marker`, `Markers`, shapes, and info bubbles
