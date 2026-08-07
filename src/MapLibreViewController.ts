import * as maplibregl from 'maplibre-gl';
import {
  BaseMapViewController,
  type CameraRestriction,
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
  type MapUISettings,
  type GlGestureHandlers,
  applyGlMapUISettings,
  isEmptyCameraRestriction,
  MapProjection,
} from '@mapconductor/js-sdk-core';
import { ZoomAltitudeConverter } from './zoom/ZoomAltitudeConverter';
import { MapLibreMapViewHolder } from './MapLibreMapViewHolder';
import { MapLibreMarkerController } from './marker/MapLibreMarkerController';
import { MapLibreMarkerEventController } from './marker/MapLibreMarkerEventController';
import { MapLibreCircleController } from './circle/MapLibreCircleController';
import { MapLibrePolylineController } from './polyline/MapLibrePolylineController';
import { MapLibrePolygonConductor } from './polygon/MapLibrePolygonConductor';
import { MapLibreGroundImageController } from './groundimage/MapLibreGroundImageController';
import { MapLibreRasterLayerController } from './raster/MapLibreRasterLayerController';
import { installMapEventListeners } from './MapLibreViewControllerEvents';
import {
  easeToPosition,
  fitMapBounds,
  jumpToPosition,
  readCameraPosition,
} from './MapLibreViewControllerCamera';

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
  private logicalTiltHint: number | null = null;
  private readonly styleReadyRef: { current: boolean };
  /** 現在の投影法。android-sdk の MapboxMapViewController の projection と同じ役割。 */
  private projection: MapProjection;

  readonly holder: MapLibreMapViewHolder;
  private readonly markerController: MapLibreMarkerController;
  private readonly markerEventController: MapLibreMarkerEventController;
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
    logicalTiltHint: number | null = null,
    projection: MapProjection = MapProjection.Mercator,
  ) {
    super();
    this.mapInstance = holder.map;
    // `MapLibreProvider.initialize()` は `map.once('load')` を **await してから**
    // このコントローラを作る。つまり [setupEventListeners] が張る `on('load')` は
    // もう二度と発火しない。ここで初期化済みと判定できないと
    // `notifyMapInitialized()` が永久に呼ばれず、`onMapLoaded` も
    // `useMapLoaded()` も MapLibre だけ反応しなくなる。
    //
    // `loaded()` では足りない。あれはスタイルに加えて「保留中の処理が無いこと」まで
    // 見るので、load 直後でもタイル取得中は false を返す。スタイルが載っていれば
    // 初期化は済んでいるので `isStyleLoaded()` も見る。
    this.initialized = holder.map.loaded() || holder.map.isStyleLoaded() === true;
    this.holder = holder;
    this.holder.setController(this);
    this.styleReadyRef = styleReadyRef;
    this.logicalTiltHint = logicalTiltHint;
    this.projection = projection;
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

  /**
   * 投影法を切り替える。android-sdk の `MapboxMapViewController.setProjection` /
   * ios-sdk の `Coordinator.setProjection` と同じく、同値なら何もしない。
   * maplibre-gl は mapbox-gl と違い `{ type }` を受け取る。
   */
  setProjection(projection: MapProjection): void {
    if (this.projection === projection) return;
    this.projection = projection;
    this.mapInstance.setProjection({
      type: projection === MapProjection.Globe ? 'globe' : 'mercator',
    });
  }

  applyUISettings(settings: MapUISettings): void {
    applyGlMapUISettings(this.mapInstance as unknown as Partial<GlGestureHandlers>, settings, 'MapLibre');
  }

  private setupEventListeners(): void {
    installMapEventListeners({
      map: this.mapInstance,
      styleReadyRef: this.styleReadyRef,
      markerController: this.markerController,
      markerEventController: this.markerEventController,
      circleController: this.circleController,
      polylineController: this.polylineController,
      polygonController: this.polygonController,
      groundImageController: this.groundImageController,
      rasterLayerController: this.rasterLayerController,
      getCameraPosition: () => this.getCameraPosition(),
      markInitialized: () => {
        this.initialized = true;
      },
      onMapInitialized: () => this.notifyMapInitialized(),
      onMapClick: (point) => this.notifyMapClick(point),
      onMapLongClick: (point) => this.notifyMapLongClick(point),
      onCameraMoveStart: (camera) => this.notifyCameraMoveStart(camera),
      onCameraMove: (camera) => this.notifyCameraMove(camera),
      onCameraMoveEnd: (camera) => this.notifyCameraMoveEnd(camera),
    });
  }

  override setMapInitializedListener(listener: OnMapInitializedHandler | null): void {
    super.setMapInitializedListener(listener);
    if (listener && this.initialized) this.notifyMapInitialized();
  }

  moveCamera(position: MapCameraPosition): Promise<boolean> {
    this.logicalTiltHint = position.tilt;
    return jumpToPosition(this.mapInstance, position);
  }

  animateCamera(position: MapCameraPosition, durationMillis: number): Promise<boolean> {
    this.logicalTiltHint = position.tilt;
    return easeToPosition(this.mapInstance, position, durationMillis);
  }

  fitBounds(bounds: GeoRectBounds, padding: number): Promise<boolean> {
    return fitMapBounds(this.mapInstance, bounds, padding);
  }

  getCameraPosition(): MapCameraPosition | null {
    return readCameraPosition(this.mapInstance, this.holder, this.logicalTiltHint);
  }

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
    await this.rasterLayerController.composition(data);
  }

  async updateRasterLayer(state: RasterLayerState): Promise<void> {
    await this.rasterLayerController.update(state);
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
    await this.rasterLayerController.clear();
  }

  /**
   * MapLibre は MapLibre GL ベースでネイティブの範囲制限 API を持つので、
   * `BaseMapViewController` のクランプ方式ではなく直接適用する。
   * android-sdk の同名メソッドと同じ方針。
   */
  override setCameraRestriction(restriction: CameraRestriction | null): void {
    // super は呼ばない。基底クラスに保持させるとカメラ停止時のクランプ補正まで走ってしまう。
    // ネイティブ API 側で既に制限されているので二重適用になる（android-sdk と同じ振り分け）。
    const effective = isEmptyCameraRestriction(restriction) ? null : restriction;

    const bounds = effective?.bounds ?? null;
    const sw = bounds?.southWest ?? null;
    const ne = bounds?.northEast ?? null;
    this.mapInstance.setMaxBounds(
      sw != null && ne != null
        ? [
            [sw.longitude, sw.latitude],
            [ne.longitude, ne.latitude],
          ]
        : null,
    );

    // 統一ズーム（Google 準拠）を MapLibre のズーム体系へ変換する。
    const minZoom = effective?.minZoom;
    const maxZoom = effective?.maxZoom;
    this.mapInstance.setMinZoom(minZoom == null ? null : ZoomAltitudeConverter.googleZoomToMaplibreZoom(minZoom));
    this.mapInstance.setMaxZoom(maxZoom == null ? null : ZoomAltitudeConverter.googleZoomToMaplibreZoom(maxZoom));
  }

  destroy(): void {
    super.destroy();
    this.markerEventController.destroy();
    void this.clearOverlays().finally(() => {
      this.markerController.destroy();
      this.mapInstance.remove();
    });
  }
}
