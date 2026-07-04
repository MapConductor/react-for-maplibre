import maplibregl from 'maplibre-gl';
import {
  BaseMapViewController,
  createGeoPoint,
  createGeoRectBounds,
  type CameraOptions,
  type CircleCapable,
  type CircleState,
  type GeoRectBounds,
  type GroundImageCapable,
  type GroundImageState,
  type MapCameraPosition,
  type OnMapInitializedHandler,
  type MapViewControllerInterface,
  type MarkerAnimationOverlayHost,
  type MarkerCapable,
  type MarkerState,
  type OnCircleEventHandler,
  type OnGroundImageEventHandler,
  type OnMarkerEventHandler,
  type OnPolygonEventHandler,
  type OnPolylineEventHandler,
  type PolygonCapable,
  type PolygonState,
  type PolylineCapable,
  type PolylineState,
  type RasterLayerCapable,
  type RasterLayerState,
} from '@mapconductor/js-sdk-core';
import { lngLatFromEvent } from './helpers';
import { toCameraPosition, toMapCameraPosition } from './MapCameraPosition';
import { MapLibreMapViewHolder } from './MapLibreMapViewHolder';
import { MapLibreMarkerController } from './marker/MapLibreMarkerController';
import { MapLibreMarkerEventController } from './marker/MapLibreMarkerEventController';
import { MapLibreCircleController } from './circle/MapLibreCircleController';
import { MapLibrePolylineController } from './polyline/MapLibrePolylineController';
import { MapLibrePolygonConductor } from './polygon/MapLibrePolygonConductor';
import { MapLibreGroundImageController } from './groundimage/MapLibreGroundImageController';
import { MapLibreRasterLayerController } from './raster/MapLibreRasterLayerController';

export class MapLibreViewController
  extends BaseMapViewController
  implements
    MapViewControllerInterface,
    MarkerCapable,
    CircleCapable,
    PolylineCapable,
    PolygonCapable,
    GroundImageCapable,
    RasterLayerCapable
{
  private readonly mapInstance: maplibregl.Map;
  private initialized = false;
  private readonly styleReadyRef: { current: boolean };

  readonly holder: MapLibreMapViewHolder;
  private readonly markerController: MapLibreMarkerController;
  private readonly markerEventController: MapLibreMarkerEventController;
  private groundImagePointerDown: { point: ReturnType<typeof lngLatFromEvent>; screen: { x: number; y: number } } | null = null;
  private skipNextGroundImageClick = false;
  private readonly circleController: MapLibreCircleController;
  private readonly polylineController: MapLibrePolylineController;
  private readonly polygonController: MapLibrePolygonConductor;
  private readonly groundImageController: MapLibreGroundImageController;
  private readonly rasterLayerController: MapLibreRasterLayerController;

  constructor(
    holder: MapLibreMapViewHolder,
    markerController: MapLibreMarkerController,
    markerEventController: MapLibreMarkerEventController,
    circleController: MapLibreCircleController,
    polylineController: MapLibrePolylineController,
    polygonController: MapLibrePolygonConductor,
    groundImageController: MapLibreGroundImageController,
    rasterLayerController: MapLibreRasterLayerController,
    styleReadyRef: { current: boolean } = { current: true },
  ) {
    super();
    this.mapInstance = holder.map;
    this.initialized = holder.map.loaded();
    this.holder = holder;
    this.holder.setController(this);
    this.styleReadyRef = styleReadyRef;
    this.markerController = markerController;
    this.markerEventController = markerEventController;
    this.circleController = circleController;
    this.polylineController = polylineController;
    this.polygonController = polygonController;
    this.groundImageController = groundImageController;
    this.rasterLayerController = rasterLayerController;
    this.markerController.onRasterLayerUpdate = async (state) => {
      if (state) {
        await this.rasterLayerController.composition([state]);
      } else {
        await this.rasterLayerController.clear();
      }
    };
    this.setupEventListeners();
  }

  getMap(): maplibregl.Map {
    return this.mapInstance;
  }

  private setupEventListeners(): void {
    this.mapInstance.on('movestart', () => {
      const camera = this.getCameraPosition();
      if (camera) this.notifyCameraMoveStart(camera);
    });

    const preventGroundImageDrag = (e: { lngLat: { lat: number; lng: number }; point: { x: number; y: number }; preventDefault: () => void }) => {
      const point = lngLatFromEvent(e);
      if (this.groundImageController.hasClickableAt(point)) {
        e.preventDefault();
        this.groundImagePointerDown = { point, screen: e.point };
      }
    };
    const dispatchGroundImagePointerUp = (e: { point: { x: number; y: number } }) => {
      const down = this.groundImagePointerDown;
      this.groundImagePointerDown = null;
      if (!down) return;

      const dx = e.point.x - down.screen.x;
      const dy = e.point.y - down.screen.y;
      if (Math.hypot(dx, dy) > 8) return;
      if (this.groundImageController.dispatchClick(down.point)) {
        this.skipNextGroundImageClick = true;
      }
    };
    this.mapInstance.on('mousedown', preventGroundImageDrag);
    this.mapInstance.on('touchstart', preventGroundImageDrag);
    this.mapInstance.on('mouseup', dispatchGroundImagePointerUp);
    this.mapInstance.on('touchend', dispatchGroundImagePointerUp);

    this.mapInstance.on('click', (e) => {
      const point = lngLatFromEvent(e);
      // Check markers first (handles both regular and tiled markers), mirroring Android's onMapClick.
      const markerEntity = this.markerController.findWithZoom(
        point,
        this.mapInstance.getZoom(),
        this.markerEventController.lastPointerType,
      );
      if (markerEntity?.state.clickable) {
        this.markerController.dispatchClick(markerEntity.state);
        return;
      }
      if (this.skipNextGroundImageClick && this.groundImageController.hasClickableAt(point)) {
        this.skipNextGroundImageClick = false;
        return;
      }
      this.skipNextGroundImageClick = false;
      if (this.groundImageController.dispatchClick(point)) {
        return;
      }
      this.notifyMapClick(point);
    });

    this.mapInstance.on('contextmenu', (e) => {
      this.notifyMapLongClick(lngLatFromEvent(e));
    });

    this.mapInstance.on('move', () => {
      const camera = this.getCameraPosition();
      if (camera) this.notifyCameraMove(camera);
    });

    this.mapInstance.on('moveend', () => {
      const camera = this.getCameraPosition();
      if (camera) this.notifyCameraMoveEnd(camera);
    });

    this.mapInstance.on('load', () => {
      this.styleReadyRef.current = true;
      this.initialized = true;
      this.notifyMapInitialized();
    });

    this.mapInstance.on('error', (e) => {
      console.error('[MapConductor] MapLibre error:', e.error);
    });

    const resyncAll = () => {
      void this.markerController.resync().then(() => this.markerEventController.resync());
      void this.circleController.resync();
      void this.polylineController.resync();
      this.polygonController.resync();
      this.groundImageController.resync();
      this.rasterLayerController.resync();
    };

    this.mapInstance.on('styledata', () => {
      const loaded = this.mapInstance.isStyleLoaded() === true;
      if (loaded && !this.styleReadyRef.current) {
        this.styleReadyRef.current = true;
        resyncAll();
      } else if (!loaded) {
        this.styleReadyRef.current = false;
      }
    });

    // Fallback: styledata can fire with isStyleLoaded()=false as the last event
    // (e.g. after setProjection), leaving styleReady stuck at false even though
    // the style is actually loaded.  The idle event fires once the map is stable,
    // guaranteeing isStyleLoaded()=true, so use it to recover.
    this.mapInstance.on('idle', () => {
      if (!this.styleReadyRef.current && this.mapInstance.isStyleLoaded()) {
        this.styleReadyRef.current = true;
        resyncAll();
      }
    });

    if (this.mapInstance.isStyleLoaded()) {
      this.styleReadyRef.current = true;
    }
  }

  override setMapInitializedListener(listener: OnMapInitializedHandler | null): void {
    super.setMapInitializedListener(listener);
    if (listener && this.initialized) this.notifyMapInitialized();
  }

  moveCamera(position: MapCameraPosition): Promise<boolean> {
    const cam = toCameraPosition(position);
    return new Promise((resolve) => {
      this.mapInstance.once('moveend', () => resolve(true));
      this.mapInstance.flyTo({
        center: cam.center,
        zoom: cam.zoom,
        bearing: cam.bearing,
        pitch: cam.pitch,
      });
    });
  }

  animateCamera(position: MapCameraPosition, options?: CameraOptions): Promise<boolean> {
    const cam = toCameraPosition(position);
    return new Promise((resolve) => {
      this.mapInstance.once('moveend', () => resolve(true));
      const padding = options?.padding ?? options?.paddings;
      this.mapInstance.easeTo({
        center: cam.center,
        zoom: cam.zoom,
        bearing: cam.bearing,
        pitch: cam.pitch,
        duration: options?.duration || 500,
        ...(padding != null ? { padding } : {}),
      });
    });
  }

  fitBounds(bounds: GeoRectBounds, options?: CameraOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.mapInstance.once('moveend', () => resolve(true));
      const fitPadding = options?.padding ?? options?.paddings;
      this.mapInstance.fitBounds(
        [
          [bounds.southWest!.longitude, bounds.southWest!.latitude],
          [bounds.northEast!.longitude, bounds.northEast!.latitude],
        ],
        { ...(fitPadding != null ? { padding: fitPadding } : {}), duration: options?.duration },
      );
    });
  }

  getCameraPosition(): MapCameraPosition | null {
    const camera = toMapCameraPosition({
      center: this.mapInstance.getCenter(),
      zoom: this.mapInstance.getZoom(),
      bearing: this.mapInstance.getBearing(),
      pitch: this.mapInstance.getPitch(),
    });
    const bounds = this.getBounds();
    if (!camera || !bounds) return camera;
    // Matches Android: the visible region rides on cameraPosition so that
    // mapViewState.cameraPosition.visibleRegion works without the controller.
    return camera.copy({
      visibleRegion: { bounds, nearLeft: null, nearRight: null, farLeft: null, farRight: null },
    });
  }

  getBounds(): GeoRectBounds | null {
    const bounds = this.mapInstance.getBounds();
    return createGeoRectBounds({
      southWest: createGeoPoint({ latitude: bounds.getSouth(), longitude: bounds.getWest() }),
      northEast: createGeoPoint({ latitude: bounds.getNorth(), longitude: bounds.getEast() }),
    });
  }

  // --- Marker ---

  async compositionMarkers(data: MarkerState[]): Promise<void> {
    await this.markerController.composition(data);
    this.markerEventController.resync();
  }

  async updateMarker(state: MarkerState): Promise<void> {
    await this.markerController.update(state);
    this.markerEventController.resync();
  }

  hasMarker(state: MarkerState): boolean {
    return this.markerController.has(state);
  }

  setOnMarkerClickListener(_listener: OnMarkerEventHandler | null): void {
    this.markerEventController.setClickListener(_listener);
  }
  setOnMarkerDragStart(_listener: OnMarkerEventHandler | null): void {
    this.markerEventController.setDragStartListener(_listener);
  }
  setOnMarkerDrag(_listener: OnMarkerEventHandler | null): void {
    this.markerEventController.setDragListener(_listener);
  }
  setOnMarkerDragEnd(_listener: OnMarkerEventHandler | null): void {
    this.markerEventController.setDragEndListener(_listener);
  }
  setOnMarkerAnimateStart(_listener: OnMarkerEventHandler | null): void {
    this.markerEventController.setAnimateStartListener(_listener);
  }
  setOnMarkerAnimateEnd(_listener: OnMarkerEventHandler | null): void {
    this.markerEventController.setAnimateEndListener(_listener);
  }
  setMarkerAnimationOverlayHost(host: MarkerAnimationOverlayHost | null): void {
    this.markerController.setMarkerAnimationOverlayHost(host);
  }

  // --- Circle ---

  async compositionCircles(data: CircleState[]): Promise<void> {
    await this.circleController.composition(data);
  }

  async updateCircle(state: CircleState): Promise<void> {
    await this.circleController.update(state);
  }

  hasCircle(state: CircleState): boolean {
    return this.circleController.has(state);
  }

  setOnCircleClickListener(_listener: OnCircleEventHandler | null): void {
    this.circleController.clickListener = _listener;
  }

  // --- Polyline ---

  async compositionPolylines(data: PolylineState[]): Promise<void> {
    await this.polylineController.composition(data);
  }

  async updatePolyline(state: PolylineState): Promise<void> {
    await this.polylineController.update(state);
  }

  hasPolyline(state: PolylineState): boolean {
    return this.polylineController.has(state);
  }

  setOnPolylineClickListener(_listener: OnPolylineEventHandler | null): void {
    this.polylineController.clickListener = _listener;
  }

  // --- Polygon ---

  async compositionPolygons(data: PolygonState[]): Promise<void> {
    await this.polygonController.composition(data);
  }

  async updatePolygon(state: PolygonState): Promise<void> {
    await this.polygonController.update(state);
  }

  hasPolygon(state: PolygonState): boolean {
    return this.polygonController.has(state);
  }

  setOnPolygonClickListener(_listener: OnPolygonEventHandler | null): void {
    this.polygonController.clickListener = _listener;
  }

  // --- GroundImage ---

  async compositionGroundImages(data: GroundImageState[]): Promise<void> {
    this.groundImageController.composition(data);
  }

  async updateGroundImage(state: GroundImageState): Promise<void> {
    this.groundImageController.update(state);
  }

  hasGroundImage(state: GroundImageState): boolean {
    return this.groundImageController.has(state);
  }

  setOnGroundImageClickListener(_listener: OnGroundImageEventHandler | null): void {}

  // --- RasterLayer ---

  async compositionRasterLayers(data: RasterLayerState[]): Promise<void> {
    this.rasterLayerController.composition(data);
  }

  async updateRasterLayer(state: RasterLayerState): Promise<void> {
    this.rasterLayerController.update(state);
  }

  hasRasterLayer(state: RasterLayerState): boolean {
    return this.rasterLayerController.has(state);
  }

  // --- Lifecycle ---

  async clearOverlays(): Promise<void> {
    await this.markerController.clear();
    await this.circleController.clear();
    await this.polylineController.clear();
    await this.polygonController.clear();
    this.groundImageController.clear();
    this.rasterLayerController.clear();
  }

  destroy(): void {
    this.markerEventController.destroy();
    void this.clearOverlays().finally(() => {
      this.markerController.destroy();
      this.mapInstance.remove();
    });
  }
}
