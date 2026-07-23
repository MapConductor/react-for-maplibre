export { MapLibreProvider } from './MapLibreProvider';
export { MapLibreViewController } from './MapLibreViewController';
export { MapLibreMapView, MapLibreMapView2D } from './MapLibreView.web';
export { MapLibreDesign } from './MapLibreDesign';
export { MapLibreViewState, useMapLibreViewState } from './MapLibreViewState';
export type { MapLibreMapDesignType } from './MapLibreDesign';
export type { MapLibreViewStateInterface } from './MapLibreViewState';
export type { MapLibreConfig } from './MapLibreProvider';
export type { MapLibreMapViewProps } from './MapLibreView.web';
export { ZoomAltitudeConverter } from './zoom/ZoomAltitudeConverter';

// MapLibre GL JS v6 ships ESM-only and loads its Web Worker from a real URL.
// With a bundler (Vite, webpack, esbuild, Rollup) that URL must be provided once
// before the first map is created. Re-exported here so consumers can configure it
// without adding `maplibre-gl` as a direct dependency. See the README for the
// per-bundler snippet.
export { setWorkerUrl as setMapLibreWorkerUrl } from 'maplibre-gl';
