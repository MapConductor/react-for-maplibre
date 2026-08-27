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

// MapLibre GL JS v6 ships ESM-only and loads its Web Worker from a real URL, which
// no bundler can resolve on its own (see workerBootstrap.ts). That worker is bundled
// into this package and registered automatically when the first map is created, so
// no setup is required.
//
// This override remains for consumers who would rather serve the worker from their
// own URL — a shared CDN, or a build that already emits it. Call it before creating
// the first map; once set, the bundled fallback is skipped and never downloaded.
export { setWorkerUrl as setMapLibreWorkerUrl } from 'maplibre-gl';
