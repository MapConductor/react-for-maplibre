// Native-safe entry point: only the plain-data view state and design types, with no static
// import of `maplibre-gl` (the web-only MapLibre GL JS renderer). `./index.ts`'s barrel pulls in
// `MapLibreView.web`/`MapLibreProvider` and re-exports `setWorkerUrl` from `maplibre-gl` itself -
// fine for bundlers targeting a browser, but Metro/Hermes evaluates that eagerly and
// `maplibre-gl` needs browser globals (Worker, HTMLCanvasElement) that don't exist in React
// Native. `@mapconductor/reactnative-for-maplibre` imports from here instead of the root barrel.
// Same arrangement as `react-for-arcgis/src/state.ts`.
export { MapLibreDesign, type MapLibreMapDesignType } from './MapLibreDesign';
export {
  MapLibreViewState,
  useMapLibreViewState,
  type MapLibreViewStateInterface,
  type MapLibreViewStateParams,
} from './MapLibreViewState';
