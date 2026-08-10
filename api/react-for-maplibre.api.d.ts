import * as maplibregl from 'maplibre-gl';
export { setWorkerUrl as setMapLibreWorkerUrl } from 'maplibre-gl';
import { MapConfig, GeoRectBounds, MapProjection, MarkerTilingOptions, MapProvider, MapViewControllerInterface, MapViewHolderBase, GeoPointInterface, Offset, GeoPoint, MarkerEntity, AbstractMarkerOverlayRenderer, MarkerManager, AddParams, ChangeParams, MarkerState, BitmapIcon, AbstractMarkerController, RasterLayerState, OnMarkerEventHandler, CircleEntity, AbstractCircleOverlayRenderer, CircleManagerInterface, CircleState, CircleController, PolylineEntity, AbstractPolylineOverlayRenderer, PolylineManagerInterface, PolylineState, PolylineController, MapCameraPosition, PolygonEntity, AbstractPolygonOverlayRenderer, PolygonManagerInterface, PolygonState, OnPolygonEventHandler, AbstractGroundImageOverlayRenderer, GroundImageState, GroundImageEntity, RasterLayerOverlayRenderer, RasterLayerAddParams, RasterLayerChangeParams, RasterLayerEntity, RasterLayerController, RasterHeaderSupport, BaseMapViewController, MarkerCapable, CircleCapable, PolylineCapable, PolygonCapable, GroundImageCapable, RasterLayerCapable, MapUISettings, OnMapInitializedHandler, MarkerAnimationOverlayHost, OnCircleEventHandler, OnPolylineEventHandler, OnGroundImageEventHandler, CameraRestriction, MapViewBaseProps, WebMercatorZoomAltitudeConverter } from '@mapconductor/js-sdk-core';
import React from 'react';
import { MapLibreViewStateInterface } from './state.js';
export { MapLibreDesign, MapLibreMapDesignType, MapLibreViewState, useMapLibreViewState } from './state.js';

interface MapLibreConfig extends MapConfig {
    style?: string | maplibregl.StyleSpecification;
    maxZoom?: number;
    minZoom?: number;
    /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
    restrictBounds?: GeoRectBounds;
    projection?: MapProjection;
    markerTilingOptions?: MarkerTilingOptions;
}
/**
 * MapLibre provider implementation
 */
declare class MapLibreProvider extends MapProvider {
    private map;
    initialize(config: MapLibreConfig): Promise<MapViewControllerInterface>;
    destroy(): void;
    /** Returns true if the rejection was caused by an intentional destroy() call. */
    static isDestroyedBeforeLoad(error: unknown): boolean;
}

declare class MapLibreMapViewHolder extends MapViewHolderBase<HTMLElement, maplibregl.Map> {
    readonly mapView: HTMLElement;
    readonly map: maplibregl.Map;
    private _controller;
    constructor(mapView: HTMLElement, map: maplibregl.Map);
    getController(): MapLibreViewController | null;
    setController(controller: MapLibreViewController): void;
    toScreenOffset(position: GeoPointInterface): Offset;
    fromScreenOffsetSync(offset: Offset): GeoPoint;
}

type Coordinate = [number, number];
type PointFeature = {
    type: 'Feature';
    id?: string | number;
    geometry: {
        type: 'Point';
        coordinates: Coordinate;
    };
    properties: Record<string, unknown>;
};
type LineFeature = {
    type: 'Feature';
    id?: string | number;
    geometry: {
        type: 'LineString';
        coordinates: Coordinate[];
    };
    properties: Record<string, unknown>;
};
type PolygonFeature = {
    type: 'Feature';
    geometry: {
        type: 'Polygon';
        coordinates: Coordinate[][];
    };
    properties: Record<string, unknown>;
};
type FeatureCollection = {
    type: 'FeatureCollection';
    features: Array<PointFeature | LineFeature | PolygonFeature>;
};

type MapLibreActualMarker = PointFeature;
declare class MarkerLayer {
    protected readonly holder: MapLibreMapViewHolder;
    protected readonly canEditStyle: () => boolean;
    readonly sourceId: string;
    readonly layerId: string;
    constructor({ holder, canEditStyle, sourceId, layerId, }: {
        holder: MapLibreMapViewHolder;
        canEditStyle: () => boolean;
        sourceId: string;
        layerId: string;
    });
    draw(entities: MarkerEntity<MapLibreActualMarker>[]): boolean;
    ensureStyleResources(): boolean;
    protected setData(data: FeatureCollection): boolean;
    setIconOffsets(offsets: ReadonlyMap<string, [number, number]>, fallback: [number, number]): void;
}

declare class MarkerDragLayer extends MarkerLayer {
    selected: MarkerEntity<MapLibreActualMarker> | null;
    constructor({ holder, canEditStyle, sourceId, layerId, }: {
        holder: MapLibreMapViewHolder;
        canEditStyle: () => boolean;
        sourceId: string;
        layerId: string;
    });
    updatePosition(position: GeoPoint): boolean;
    drawSelected(): boolean;
}

declare class MapLibreMarkerOverlayRenderer extends AbstractMarkerOverlayRenderer<MapLibreMapViewHolder, MapLibreActualMarker> {
    private readonly defaultMarkerIcon;
    private readonly iconRefCounter;
    private readonly iconBitmaps;
    private readonly pendingImageRemovals;
    readonly markerManager: MarkerManager<MapLibreActualMarker>;
    readonly markerLayer: MarkerLayer;
    readonly dragLayer: MarkerDragLayer;
    constructor({ holder, markerManager, markerLayer, dragLayer, }: {
        holder: MapLibreMapViewHolder;
        markerManager: MarkerManager<MapLibreActualMarker>;
        markerLayer: MarkerLayer;
        dragLayer: MarkerDragLayer;
    });
    onAdd(data: AddParams[]): Promise<(MapLibreActualMarker | null)[]>;
    onChange(data: ChangeParams<MapLibreActualMarker>[]): Promise<(MapLibreActualMarker | null)[]>;
    onRemove(data: MarkerEntity<MapLibreActualMarker>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    setMarkerVisible(entity: MarkerEntity<MapLibreActualMarker>, visible: boolean): void;
    setMarkerPosition(entity: MarkerEntity<MapLibreActualMarker>, position: GeoPoint): void;
    updateSelectedMarker({ entity, state, bitmapIcon, }: {
        entity: MarkerEntity<MapLibreActualMarker>;
        state: MarkerState;
        bitmapIcon: BitmapIcon;
    }): Promise<void>;
    drawDragLayer(): void;
    redraw(): void;
    resync(): Promise<void>;
    private createMarkerFeature;
    private retainIcon;
    private releaseIcon;
    private customIconKey;
    private ensureImages;
    private ensureImage;
    private loadBitmapIcon;
    private ensureFallbackDefaultIcon;
    private removeUnusedImages;
    private syncIconOffsets;
    buildEntity(marker: MapLibreActualMarker, state: MarkerState): MarkerEntity<MapLibreActualMarker>;
}

declare class MapLibreMarkerController extends AbstractMarkerController<MapLibreActualMarker> {
    private readonly holder;
    readonly renderer: MapLibreMarkerOverlayRenderer;
    private selected;
    private pendingSelectedPosition;
    private selectedPositionFrame;
    private readonly tilingOptions;
    private tileRenderer;
    private tileRouteId;
    private tileVersion;
    private tileGeneration;
    /** Called by MapLibreViewController when RasterLayerState changes. */
    onRasterLayerUpdate: ((state: RasterLayerState | null) => Promise<void>) | null;
    constructor(holder: MapLibreMapViewHolder, renderer: MapLibreMarkerOverlayRenderer, tilingOptions?: MarkerTilingOptions);
    protected shouldTile(state: MarkerState, totalCount: number): boolean;
    protected onTiledMarkersChanged(): Promise<void>;
    private syncTiledOverlay;
    private serviceWorkerTileTemplate;
    private localTileTemplate;
    private removeTileOverlay;
    composition(data: MarkerState[]): Promise<void>;
    find(position: GeoPoint): MarkerEntity<MapLibreActualMarker> | null;
    /**
     * Find the marker nearest to `position` at the given zoom level.
     * Handles both regular markers (icon-bounds check) and tiled markers (geographic radius).
     * Mirrors Android's `GoogleMapMarkerController.find(position, zoom)`.
     */
    findWithZoom(position: GeoPoint, zoom: number, pointerType: 'touch' | 'mouse'): MarkerEntity<MapLibreActualMarker> | null;
    update(state: MarkerState): Promise<void>;
    has(state: MarkerState): boolean;
    getSelectedMarker(): MarkerEntity<MapLibreActualMarker> | null;
    setSelectedMarker(entity: MarkerEntity<MapLibreActualMarker> | null): Promise<void>;
    updateSelectedPosition(position: GeoPoint): void;
    resync(): Promise<void>;
    clear(): Promise<void>;
    destroy(): void;
    private flushSelectedPosition;
    private cancelSelectedPositionFrame;
    private hasCompositionChanges;
}

declare class MapLibreMarkerEventController {
    private readonly controller;
    private activePointerId;
    private dragPanWasEnabled;
    private pointerDownOffset;
    private dragStarted;
    /** Last observed pointer input type — used by MapLibreViewController for tile-marker hit radius. */
    lastPointerType: 'touch' | 'mouse';
    constructor(controller: MapLibreMarkerController);
    resync(): void;
    setClickListener(listener: OnMarkerEventHandler | null): void;
    setDragStartListener(listener: OnMarkerEventHandler | null): void;
    setDragListener(listener: OnMarkerEventHandler | null): void;
    setDragEndListener(listener: OnMarkerEventHandler | null): void;
    setAnimateStartListener(listener: OnMarkerEventHandler | null): void;
    setAnimateEndListener(listener: OnMarkerEventHandler | null): void;
    destroy(): void;
    private readonly handlePointerDown;
    private readonly handlePointerMove;
    private readonly handlePointerUp;
    private readonly handlePointerCancel;
    private finishDrag;
    private restoreMapInteraction;
    private findMarkerAtPointer;
    private positionFromPointer;
    private localPoint;
}

type MapLibreActualCircle = PolygonFeature & {
    id?: string | number;
};
declare class MapLibreCircleLayer {
    static readonly Prop: {
        readonly FILL_COLOR: "fillColor";
        readonly STROKE_COLOR: "strokeColor";
        readonly STROKE_WIDTH: "strokeWidth";
        readonly Z_INDEX: "zIndex";
    };
    private readonly holder;
    private readonly canEditStyle;
    readonly sourceId: string;
    readonly layerId: string;
    readonly strokeLayerId: string;
    constructor({ holder, canEditStyle, sourceId, layerId, }: {
        holder: MapLibreMapViewHolder;
        canEditStyle: () => boolean;
        sourceId?: string;
        layerId?: string;
    });
    draw(entities: CircleEntity<MapLibreActualCircle>[]): boolean;
    private ensureStyleResources;
}

declare class MapLibreCircleOverlayRenderer extends AbstractCircleOverlayRenderer<MapLibreMapViewHolder, MapLibreActualCircle> {
    readonly layer: MapLibreCircleLayer;
    readonly circleManager: CircleManagerInterface<MapLibreActualCircle>;
    constructor({ layer, circleManager, holder, }: {
        layer: MapLibreCircleLayer;
        circleManager: CircleManagerInterface<MapLibreActualCircle>;
        holder: MapLibreMapViewHolder;
    });
    createCircle(state: CircleState): Promise<MapLibreActualCircle | null>;
    updateCircleProperties({ current, }: {
        circle: MapLibreActualCircle;
        current: CircleEntity<MapLibreActualCircle>;
        prev: CircleEntity<MapLibreActualCircle>;
    }): Promise<MapLibreActualCircle | null>;
    removeCircle(_entity: CircleEntity<MapLibreActualCircle>): Promise<void>;
    onPostProcess(): Promise<void>;
    redraw(): Promise<void>;
}

declare class MapLibreCircleController extends CircleController<MapLibreActualCircle> {
    readonly renderer: MapLibreCircleOverlayRenderer;
    constructor(renderer: MapLibreCircleOverlayRenderer);
    update(state: CircleState): Promise<void>;
    resync(): Promise<void>;
    clear(): Promise<void>;
    /**
     * Hit-test a map click (its lat/lng) against the circles geometrically (inside
     * the fill radius) and dispatch the click on the matching circle. Does NOT use
     * a MapLibre layer/overlay click event — detection is driven by the map click
     * position, matching the marker/polyline paths and android. Returns true if hit.
     */
    handleMapClick(clicked: GeoPoint): boolean;
}

type MapLibreActualPolyline = LineFeature[];
declare class MapLibrePolylineLayer {
    static readonly Prop: {
        readonly STROKE_COLOR: "strokeColor";
        readonly STROKE_WIDTH: "strokeWidth";
        readonly Z_INDEX: "zIndex";
    };
    private readonly holder;
    private readonly canEditStyle;
    readonly sourceId: string;
    readonly layerId: string;
    constructor({ holder, canEditStyle, sourceId, layerId, }: {
        holder: MapLibreMapViewHolder;
        canEditStyle: () => boolean;
        sourceId?: string;
        layerId?: string;
    });
    draw(entities: PolylineEntity<MapLibreActualPolyline>[]): boolean;
    private ensureStyleResources;
}

declare class MapLibrePolylineOverlayRenderer extends AbstractPolylineOverlayRenderer<MapLibreMapViewHolder, MapLibreActualPolyline> {
    readonly layer: MapLibrePolylineLayer;
    readonly polylineManager: PolylineManagerInterface<MapLibreActualPolyline>;
    constructor({ layer, polylineManager, holder, }: {
        layer: MapLibrePolylineLayer;
        polylineManager: PolylineManagerInterface<MapLibreActualPolyline>;
        holder: MapLibreMapViewHolder;
    });
    createPolyline(state: PolylineState): Promise<MapLibreActualPolyline | null>;
    updatePolylineProperties({ current, }: {
        polyline: MapLibreActualPolyline;
        current: PolylineEntity<MapLibreActualPolyline>;
        prev: PolylineEntity<MapLibreActualPolyline>;
    }): Promise<MapLibreActualPolyline | null>;
    removePolyline(_entity: PolylineEntity<MapLibreActualPolyline>): Promise<void>;
    onPostProcess(): Promise<void>;
    redraw(): Promise<void>;
    private resolveZIndex;
}

declare class MapLibrePolylineController extends PolylineController<MapLibreActualPolyline> {
    readonly renderer: MapLibrePolylineOverlayRenderer;
    constructor(renderer: MapLibrePolylineOverlayRenderer);
    resync(): Promise<void>;
    clear(): Promise<void>;
    /**
     * Hit-test a map click (its lat/lng) against the polylines geometrically and,
     * if the click lands within the tap tolerance of a line, dispatch the click on
     * the nearest polyline (with the closest point on that line as `clicked`).
     *
     * This intentionally does NOT use a MapLibre layer/overlay click event. Like
     * android (`TomTomMapViewController.onPolylineClickedInternal`) and the marker
     * path, the hit is derived from the map click position, so behaviour matches
     * across providers. Returns true if a polyline was hit (so the caller can
     * suppress the generic map click).
     */
    handleMapClick(clicked: GeoPoint, camera: MapCameraPosition | null): boolean;
}

interface MapLibreActualPolygon {
    readonly fillFeatures: PolygonFeature[];
    readonly outlineFeatures: LineFeature[];
}
declare class MapLibrePolygonLayer {
    static readonly Prop: {
        readonly FILL_COLOR: "fillColor";
        readonly STROKE_COLOR: "strokeColor";
        readonly STROKE_WIDTH: "strokeWidth";
        readonly Z_INDEX: "zIndex";
    };
    private readonly holder;
    private readonly canEditStyle;
    readonly sourceId: string;
    readonly layerId: string;
    readonly outlineSourceId: string;
    readonly outlineLayerId: string;
    constructor({ holder, canEditStyle, sourceId, layerId, outlineSourceId, outlineLayerId, }: {
        holder: MapLibreMapViewHolder;
        canEditStyle: () => boolean;
        sourceId?: string;
        layerId?: string;
        outlineSourceId?: string;
        outlineLayerId?: string;
    });
    draw(entities: PolygonEntity<MapLibreActualPolygon>[]): boolean;
    private ensureStyleResources;
}

declare class MapLibrePolygonOverlayRenderer extends AbstractPolygonOverlayRenderer<MapLibreMapViewHolder, MapLibreActualPolygon> {
    readonly layer: MapLibrePolygonLayer;
    readonly polygonManager: PolygonManagerInterface<MapLibreActualPolygon>;
    constructor({ layer, polygonManager, holder, }: {
        layer: MapLibrePolygonLayer;
        polygonManager: PolygonManagerInterface<MapLibreActualPolygon>;
        holder: MapLibreMapViewHolder;
    });
    createPolygon(state: PolygonState): Promise<MapLibreActualPolygon | null>;
    updatePolygonProperties({ current, }: {
        polygon: MapLibreActualPolygon;
        current: PolygonEntity<MapLibreActualPolygon>;
        prev: PolygonEntity<MapLibreActualPolygon>;
    }): Promise<MapLibreActualPolygon | null>;
    removePolygon(_entity: PolygonEntity<MapLibreActualPolygon>): Promise<void>;
    onPostProcess(): Promise<void>;
}

declare class MapLibrePolygonConductor {
    readonly polygonOverlay: MapLibrePolygonOverlayRenderer;
    clickListener: OnPolygonEventHandler | null;
    private operation;
    constructor(polygonOverlay: MapLibrePolygonOverlayRenderer);
    composition(data: PolygonState[]): Promise<void>;
    update(state: PolygonState): Promise<void>;
    has(state: PolygonState): boolean;
    resync(): Promise<void>;
    clear(): Promise<void>;
    private redraw;
    /**
     * Hit-test a map click (its lat/lng) against the polygons geometrically
     * (point-in-polygon, honouring holes and zIndex) and dispatch the click on the
     * top-most polygon that contains the point. Does NOT use a MapLibre
     * layer/overlay click event — detection is driven by the map click position,
     * matching the marker/polyline paths and android. Returns true if hit.
     */
    handleMapClick(clicked: GeoPoint): boolean;
    private enqueue;
}

declare class MapLibreGroundImageOverlayRenderer extends AbstractGroundImageOverlayRenderer<MapLibreMapViewHolder, string> {
    private readonly canEditStyle;
    /** Last values applied to the map style, keyed by state id. */
    private readonly applied;
    constructor({ holder, canEditStyle, }: {
        holder: MapLibreMapViewHolder;
        canEditStyle: () => boolean;
    });
    sourceId(id: string): string;
    layerId(id: string): string;
    createGroundImage(state: GroundImageState): Promise<string | null>;
    updateGroundImageProperties({ current, }: {
        groundImage: string;
        current: GroundImageEntity<string>;
        prev: GroundImageEntity<string>;
    }): Promise<string | null>;
    /** Sync an already-created image source+layer to the current state (diffed). */
    private applyToExisting;
    removeGroundImage(entity: GroundImageEntity<string>): Promise<void>;
}

declare class MapLibreGroundImageController {
    private readonly groundImageStates;
    private readonly groundImageIds;
    private readonly pendingUpdates;
    private readonly renderer;
    private updateFrame;
    constructor(renderer: MapLibreGroundImageOverlayRenderer);
    composition(data: GroundImageState[]): void;
    update(state: GroundImageState): void;
    has(state: GroundImageState): boolean;
    hasClickableAt(point: GeoPoint): boolean;
    dispatchClick(point: GeoPoint): boolean;
    resync(): void;
    clear(): void;
    private cancelPendingUpdates;
    private upsert;
    private removeById;
}

/** GL のソース／レイヤー ID の対。android-sdk の MapLibreRasterLayerHandle と同一。 */
interface MapLibreRasterLayerHandle {
    readonly sourceId: string;
    readonly layerId: string;
}
/**
 * android-sdk と同じく汎用 RasterLayerController が駆動する OverlayRenderer 実装。
 * onAdd/onChange/onRemove でネイティブ GL のソース・レイヤーを操作する。スタイルが
 * まだ編集できない場合はハンドルだけ返し、スタイル (再)読み込み後に controller.resync()
 * で貼り直す。
 */
declare class MapLibreRasterLayerOverlayRenderer implements RasterLayerOverlayRenderer<MapLibreRasterLayerHandle> {
    readonly holder: MapLibreMapViewHolder;
    private readonly canEditStyle;
    constructor(holder: MapLibreMapViewHolder, canEditStyle: () => boolean);
    private sourceId;
    private layerId;
    onAdd(data: RasterLayerAddParams[]): Promise<(MapLibreRasterLayerHandle | null)[]>;
    onChange(data: RasterLayerChangeParams<MapLibreRasterLayerHandle>[]): Promise<(MapLibreRasterLayerHandle | null)[]>;
    onRemove(data: RasterLayerEntity<MapLibreRasterLayerHandle>[]): Promise<void>;
    onCameraChanged(_mapCameraPosition: MapCameraPosition): Promise<void>;
    onPostProcess(): Promise<void>;
    private addLayer;
    private updateLayer;
    private removeLayer;
}

/**
 * android-sdk の MapLibreRasterLayerController と同じく汎用 RasterLayerController の薄い
 * サブクラス。composition/update/has/clear は基底クラスが提供する。GL スタイルが
 * 再読み込みされると既存のソース・レイヤーは失われるため、resync() で登録済みの
 * ラスターレイヤーを貼り直す（android-sdk の reapplyStyle 相当）。
 */
declare class MapLibreRasterLayerController extends RasterLayerController<MapLibreRasterLayerHandle> {
    /**
     * maplibre-gl の transformRequest（MapLibreProvider が地図生成時に差している）でタイル要求にヘッダを載せる。
     *
     * userAgent はブラウザが上書きを許さないので、どのプロバイダでも web では効かない。
     */
    protected get headerSupport(): RasterHeaderSupport;
    constructor(renderer: MapLibreRasterLayerOverlayRenderer);
    resync(): Promise<void>;
}

declare class MapLibreViewController extends BaseMapViewController implements MapViewControllerInterface, MarkerCapable, CircleCapable, PolylineCapable, PolygonCapable, GroundImageCapable, RasterLayerCapable {
    private readonly mapInstance;
    private initialized;
    private logicalTiltHint;
    private readonly styleReadyRef;
    /** 現在の投影法。android-sdk の MapboxMapViewController の projection と同じ役割。 */
    private projection;
    readonly holder: MapLibreMapViewHolder;
    private readonly markerController;
    private readonly markerEventController;
    private readonly circleController;
    private readonly polylineController;
    private readonly polygonController;
    private readonly groundImageController;
    private readonly rasterLayerController;
    constructor(holder: MapLibreMapViewHolder, markerController: MapLibreMarkerController, markerEventController: MapLibreMarkerEventController, circleController: MapLibreCircleController, polylineController: MapLibrePolylineController, polygonController: MapLibrePolygonConductor, groundImageController: MapLibreGroundImageController, rasterLayerController: MapLibreRasterLayerController, styleReadyRef?: {
        current: boolean;
    }, logicalTiltHint?: number | null, projection?: MapProjection);
    getMap(): maplibregl.Map;
    /**
     * 投影法を切り替える。android-sdk の `MapboxMapViewController.setProjection` /
     * ios-sdk の `Coordinator.setProjection` と同じく、同値なら何もしない。
     * maplibre-gl は mapbox-gl と違い `{ type }` を受け取る。
     */
    setProjection(projection: MapProjection): void;
    applyUISettings(settings: MapUISettings): void;
    private setupEventListeners;
    setMapInitializedListener(listener: OnMapInitializedHandler | null): void;
    moveCamera(position: MapCameraPosition): Promise<boolean>;
    animateCamera(position: MapCameraPosition, durationMillis: number): Promise<boolean>;
    fitBounds(bounds: GeoRectBounds, padding: number): Promise<boolean>;
    getCameraPosition(): MapCameraPosition | null;
    compositionMarkers(data: MarkerState[]): Promise<void>;
    updateMarker(state: MarkerState): Promise<void>;
    hasMarker(state: MarkerState): boolean;
    setOnMarkerClickListener(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragStart(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerDrag(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragEnd(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateStart(_listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateEnd(_listener: OnMarkerEventHandler | null): void;
    setMarkerAnimationOverlayHost(host: MarkerAnimationOverlayHost | null): void;
    compositionCircles(data: CircleState[]): Promise<void>;
    updateCircle(state: CircleState): Promise<void>;
    hasCircle(state: CircleState): boolean;
    setOnCircleClickListener(_listener: OnCircleEventHandler | null): void;
    compositionPolylines(data: PolylineState[]): Promise<void>;
    updatePolyline(state: PolylineState): Promise<void>;
    hasPolyline(state: PolylineState): boolean;
    setOnPolylineClickListener(_listener: OnPolylineEventHandler | null): void;
    compositionPolygons(data: PolygonState[]): Promise<void>;
    updatePolygon(state: PolygonState): Promise<void>;
    hasPolygon(state: PolygonState): boolean;
    setOnPolygonClickListener(_listener: OnPolygonEventHandler | null): void;
    compositionGroundImages(data: GroundImageState[]): Promise<void>;
    updateGroundImage(state: GroundImageState): Promise<void>;
    hasGroundImage(state: GroundImageState): boolean;
    setOnGroundImageClickListener(_listener: OnGroundImageEventHandler | null): void;
    compositionRasterLayers(data: RasterLayerState[]): Promise<void>;
    updateRasterLayer(state: RasterLayerState): Promise<void>;
    hasRasterLayer(state: RasterLayerState): boolean;
    clearOverlays(): Promise<void>;
    /**
     * MapLibre は MapLibre GL ベースでネイティブの範囲制限 API を持つので、
     * `BaseMapViewController` のクランプ方式ではなく直接適用する。
     * android-sdk の同名メソッドと同じ方針。
     */
    setCameraRestriction(restriction: CameraRestriction | null): void;
    destroy(): void;
}

interface MapLibreMapViewProps extends MapViewBaseProps<MapLibreViewStateInterface> {
    maxZoom?: number;
    minZoom?: number;
    /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
    restrictBounds?: GeoRectBounds;
    containerStyle?: React.CSSProperties;
    onError?: (error: Error) => void;
    children?: React.ReactNode;
    markerTilingOptions?: MarkerTilingOptions;
    /**
     * 投影法。省略時は 3D 版が Globe、2D 版が Mercator。
     * android-sdk / ios-sdk の `projection: MapProjection` と同じ役割で、
     * 変更すると実行時に切り替わる。
     */
    projection?: MapProjection;
}
declare function MapLibreMapView(props: MapLibreMapViewProps): React.JSX.Element;
declare function MapLibreMapView2D(props: MapLibreMapViewProps): React.JSX.Element;

/**
 * 統一ズーム（Google Maps 基準・256px タイル）⇄ 高度の変換。
 *
 * MapLibre は 512px タイルのベクタエンジンなので、統一ズームはネイティブズーム + 1。
 * 換算式はコアの {@link WebMercatorZoomAltitudeConverter} にある。
 */
declare class ZoomAltitudeConverter extends WebMercatorZoomAltitudeConverter {
    /** Empirical offset: GoogleZoom ≈ MapLibreSDK.zoom + 1.0 */
    static readonly MAPLIBRE_TO_GOOGLE_ZOOM_OFFSET = 1;
    constructor(zoom0Altitude?: number);
    static maplibreZoomToGoogleZoom(maplibreZoom: number): number;
    static googleZoomToMaplibreZoom(googleZoom: number): number;
}

export { type MapLibreConfig, MapLibreMapView, MapLibreMapView2D, type MapLibreMapViewProps, MapLibreProvider, MapLibreViewController, MapLibreViewStateInterface, ZoomAltitudeConverter };
