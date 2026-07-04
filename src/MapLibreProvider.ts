import maplibregl from 'maplibre-gl';
import {
  CircleManager,
  MapProvider,
  MarkerManager,
  MarkerTilingOptions,
  PolygonManager,
  PolylineManager,
  type MapConfig,
  type MapViewControllerInterface,
} from '@mapconductor/js-sdk-core';
import { MapLibreViewController } from './MapLibreViewController';
import { ZoomAltitudeConverter } from './zoom/ZoomAltitudeConverter';
import { MapLibreMapViewHolder } from './MapLibreMapViewHolder';
import { MapLibreMarkerController } from './marker/MapLibreMarkerController';
import { MapLibreMarkerEventController } from './marker/MapLibreMarkerEventController';
import { MapLibreMarkerOverlayRenderer } from './marker/MapLibreMarkerOverlayRenderer';
import { MarkerLayer, type MapLibreActualMarker } from './marker/MarkerLayer';
import { MarkerDragLayer } from './marker/MarkerDragLayer';
import { MapLibreCircleController } from './circle/MapLibreCircleController';
import { MapLibreCircleLayer, type MapLibreActualCircle } from './circle/MapLibreCircleLayer';
import { MapLibreCircleOverlayRenderer } from './circle/MapLibreCircleOverlayRenderer';
import { MapLibrePolylineController } from './polyline/MapLibrePolylineController';
import { MapLibrePolylineLayer, type MapLibreActualPolyline } from './polyline/MapLibrePolylineLayer';
import { MapLibrePolylineOverlayRenderer } from './polyline/MapLibrePolylineOverlayRenderer';
import { MapLibrePolygonConductor } from './polygon/MapLibrePolygonConductor';
import { MapLibrePolygonLayer, type MapLibreActualPolygon } from './polygon/MapLibrePolygonLayer';
import { MapLibrePolygonOverlayRenderer } from './polygon/MapLibrePolygonOverlayRenderer';
import { MapLibreGroundImageController } from './groundimage/MapLibreGroundImageController';
import { MapLibreGroundImageOverlayRenderer } from './groundimage/MapLibreGroundImageOverlayRenderer';
import { MapLibreRasterLayerController } from './raster/MapLibreRasterLayerController';
import { MapLibreRasterLayerOverlayRenderer } from './raster/MapLibreRasterLayerOverlayRenderer';

export interface MapLibreConfig extends MapConfig {
  style?: string | maplibregl.StyleSpecification;
  maxZoom?: number;
  minZoom?: number;
  projection?: 'mercator' | 'globe';
  markerTilingOptions?: MarkerTilingOptions;
}

// Sentinel used to silently cancel initialization when destroy() is called before load.
// Distinct from real errors so callers can ignore it without swallowing actual failures.
const DESTROYED_BEFORE_LOAD = Symbol('DESTROYED_BEFORE_LOAD');

/**
 * MapLibre provider implementation
 */
export class MapLibreProvider extends MapProvider {
  // Track map separately from controller so destroy() works even during async init
  private map: maplibregl.Map | null = null;

  async initialize(config: MapLibreConfig): Promise<MapViewControllerInterface> {
    if (this.controller) {
      return this.controller;
    }

    const container =
      typeof config.container === 'string'
        ? document.getElementById(config.container)
        : config.container;

    if (!container) {
      throw new Error('Container element not found');
    }

    const map = new maplibregl.Map({
      container,
      style: config.style || 'https://demotiles.maplibre.org/style.json',
      center: config.initCameraPosition?.center
        ? [config.initCameraPosition.center.longitude, config.initCameraPosition.center.latitude]
        : [0, 0],
      zoom: ZoomAltitudeConverter.googleZoomToMaplibreZoom(config.initCameraPosition?.zoom ?? 10),
      bearing: config.initCameraPosition?.bearing || 0,
      pitch: config.initCameraPosition?.pitch || 0,
      maxZoom: config.maxZoom !== undefined ? ZoomAltitudeConverter.googleZoomToMaplibreZoom(config.maxZoom) : undefined,
      minZoom: config.minZoom !== undefined ? ZoomAltitudeConverter.googleZoomToMaplibreZoom(config.minZoom) : undefined,
      ...config.options,
    } as maplibregl.MapOptions);

    // Track map immediately so destroy() can remove it even before load fires
    this.map = map;

    await new Promise<void>((resolve, reject) => {
      map.once('load', () => {
        map.setProjection({ type: config.projection || 'mercator' });
        resolve();
      });
      // If destroy() is called before load fires, reject with the sentinel so the
      // caller can distinguish an intentional cleanup from an unexpected error.
      map.once('remove', () => reject(DESTROYED_BEFORE_LOAD));
    });

    // If destroy() was called during initialization, bail out silently
    if (!this.map) {
      throw DESTROYED_BEFORE_LOAD;
    }

    const holder = new MapLibreMapViewHolder(map.getContainer(), map);
    // Rely solely on styleReady rather than also calling isStyleLoaded() here.
    // isStyleLoaded() can return false transiently while MapLibre processes an
    // addLayer/addSource call, which would incorrectly block overlay resync.
    const styleReadyRef = { current: true };
    const canEditStyle = () => styleReadyRef.current;
    const markerController = getMarkerController(holder, canEditStyle, config);
    const markerEventController = new MapLibreMarkerEventController(markerController);
    const circleController = getCircleController(holder, canEditStyle);
    const polylineController = getPolylineController(holder, canEditStyle);
    const polygonController = getPolygonController(holder, canEditStyle);
    const groundImageController = getGroundImageController(holder, canEditStyle);
    const rasterLayerController = getRasterLayerController(holder, canEditStyle);

    this.controller = new MapLibreViewController(
      holder,
      markerController,
      markerEventController,
      circleController,
      polylineController,
      polygonController,
      groundImageController,
      rasterLayerController,
      styleReadyRef,
    );
    return this.controller;
  }

  destroy(): void {
    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
    } else if (this.map) {
      // Map was created but controller hasn't been set yet (load not fired)
      this.map.remove();
    }
    this.map = null;
  }

  /** Returns true if the rejection was caused by an intentional destroy() call. */
  static isDestroyedBeforeLoad(error: unknown): boolean {
    return error === DESTROYED_BEFORE_LOAD;
  }
}

function getMarkerController(
  holder: MapLibreMapViewHolder,
  canEditStyle: () => boolean,
  config: MapLibreConfig,
): MapLibreMarkerController {
  const markerManager = MarkerManager.defaultManager<MapLibreActualMarker>();
  const markerLayer = new MarkerLayer({
    holder,
    canEditStyle,
    sourceId: 'mc-markers',
    layerId: 'mc-marker-layer',
  });
  const dragLayer = new MarkerDragLayer({
    holder,
    canEditStyle,
    sourceId: 'mc-marker-drag',
    layerId: 'mc-marker-drag-layer',
  });
  const renderer = new MapLibreMarkerOverlayRenderer({
    holder,
    markerManager,
    markerLayer,
    dragLayer,
  });
  return new MapLibreMarkerController(holder, renderer, config.markerTilingOptions);
}

function getCircleController(
  holder: MapLibreMapViewHolder,
  canEditStyle: () => boolean,
): MapLibreCircleController {
  const circleManager = new CircleManager<MapLibreActualCircle>();
  const layer = new MapLibreCircleLayer({ holder, canEditStyle });
  const renderer = new MapLibreCircleOverlayRenderer({ layer, circleManager, holder });
  return new MapLibreCircleController(holder, renderer);
}

function getPolylineController(
  holder: MapLibreMapViewHolder,
  canEditStyle: () => boolean,
): MapLibrePolylineController {
  const polylineManager = new PolylineManager<MapLibreActualPolyline>();
  const layer = new MapLibrePolylineLayer({ holder, canEditStyle });
  const renderer = new MapLibrePolylineOverlayRenderer({ layer, polylineManager, holder });
  return new MapLibrePolylineController(holder, renderer);
}

function getPolygonController(
  holder: MapLibreMapViewHolder,
  canEditStyle: () => boolean,
): MapLibrePolygonConductor {
  const polygonManager = new PolygonManager<MapLibreActualPolygon>();
  const layer = new MapLibrePolygonLayer({ holder, canEditStyle });
  const renderer = new MapLibrePolygonOverlayRenderer({ layer, polygonManager, holder });
  return new MapLibrePolygonConductor(holder, renderer);
}

function getGroundImageController(
  holder: MapLibreMapViewHolder,
  canEditStyle: () => boolean,
): MapLibreGroundImageController {
  const renderer = new MapLibreGroundImageOverlayRenderer({ holder, canEditStyle });
  return new MapLibreGroundImageController(renderer);
}

function getRasterLayerController(
  holder: MapLibreMapViewHolder,
  canEditStyle: () => boolean,
): MapLibreRasterLayerController {
  const renderer = new MapLibreRasterLayerOverlayRenderer(holder, canEditStyle);
  return new MapLibreRasterLayerController(renderer);
}
