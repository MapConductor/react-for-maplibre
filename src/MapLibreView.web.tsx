import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  MapContext,
  MapViewScope,
  MapViewScopeProvider,
  InfoBubbleOverlay,
  MarkerAnimationLayer,
  type InfoBubbleEntry,
} from '@mapconductor/js-sdk-react';
import {
  MapViewBaseProps,
  OverlayCollector,
  MarkerTilingOptions,
  type MapCameraPosition,
  type GeoPoint,
  type MarkerAnimationOverlayEntry,
} from '@mapconductor/js-sdk-core';
import { MapLibreProvider, MapLibreConfig } from './MapLibreProvider';
import { MapLibreViewState } from './MapLibreViewState';
import type { MapLibreViewController } from './MapLibreViewController';
import type { StyleSpecification } from 'maplibre-gl';

export interface MapLibreViewProps extends MapViewBaseProps<MapLibreViewState> {
  // Web-specific
  maxZoom?: number;
  minZoom?: number;
  projection?: 'mercator' | 'globe';
  containerStyle?: React.CSSProperties;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
  markerTilingOptions?: MarkerTilingOptions;
}

/**
 * MapLibre React component
 *
 * Note: You must import the MapLibre CSS separately:
 * import '@mapconductor/maplibre/style.css';
 */
export function MapLibreView({
  state,
  onMapLoaded,
  onMapClick,
  onMapLongClick,
  onCameraMoveStart,
  onCameraMove,
  onCameraMoveEnd,
  maxZoom,
  minZoom,
  projection = 'mercator',
  className,
  containerStyle,
  onError,
  children,
  markerTilingOptions,
}: MapLibreViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [provider] = useState(() => new MapLibreProvider());
  const [scope] = useState(() => new MapViewScope());
  const [controller, setController] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const bridgeUnsubs = useRef<(() => void)[]>([]);
  const typedControllerRef = useRef<MapLibreViewController | null>(null);
  const [bubbleEntries, setBubbleEntries] = useState<InfoBubbleEntry[]>([]);
  const [animationEntries, setAnimationEntries] = useState<MarkerAnimationOverlayEntry[]>([]);
  const [cameraTick, setCameraTick] = useState(0);

  // Keep latest callbacks in refs to avoid stale closures without re-running the effect
  const onMapLoadedRef = useRef(onMapLoaded);
  const onMapClickRef = useRef(onMapClick);
  const onMapLongClickRef = useRef(onMapLongClick);
  const onCameraMoveStartRef = useRef(onCameraMoveStart);
  const onCameraMoveRef = useRef(onCameraMove);
  const onCameraMoveEndRef = useRef(onCameraMoveEnd);
  onMapLoadedRef.current = onMapLoaded;
  onMapClickRef.current = onMapClick;
  onMapLongClickRef.current = onMapLongClick;
  onCameraMoveStartRef.current = onCameraMoveStart;
  onCameraMoveRef.current = onCameraMove;
  onCameraMoveEndRef.current = onCameraMoveEnd;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const style = state.mapDesignType.styleJsonURL as string | StyleSpecification;

    const config: MapLibreConfig = {
      container: containerRef.current,
      style,
      maxZoom,
      minZoom,
      projection,
      initCameraPosition: state.cameraPosition,
      markerTilingOptions,
    };

    provider
      .initialize(config)
      .then((ctrl) => {
        state.setController(ctrl);
        state.setCameraPositionChangeListener(() => {
          setCameraTick(t => t + 1);
        });
        setController(ctrl);
        typedControllerRef.current = ctrl as MapLibreViewController;

        ctrl.setCameraMoveStartListener((camera: MapCameraPosition) => {
          state.updateCameraPosition(camera);
          onCameraMoveStartRef.current?.(camera);
        });
        ctrl.setCameraMoveListener((camera: MapCameraPosition) => {
          state.updateCameraPosition(camera);
          onCameraMoveRef.current?.(camera);
          setCameraTick(t => t + 1);
        });
        ctrl.setCameraMoveEndListener((camera: MapCameraPosition) => {
          state.updateCameraPosition(camera);
          onCameraMoveEndRef.current?.(camera);
          setCameraTick(t => t + 1);
        });
        ctrl.setMapClickListener((point: GeoPoint) => onMapClickRef.current?.(point));
        ctrl.setMapLongClickListener((point: GeoPoint) => onMapLongClickRef.current?.(point));
        ctrl.setMapInitializedListener(() => onMapLoadedRef.current?.(state));

        const registry = scope.buildRegistry();
        for (const overlay of registry.getAll()) {
          const unsub = overlay.subscribe((data) => {
            overlay.render(data, ctrl).catch(console.error);
          });
          bridgeUnsubs.current.push(unsub);
        }

        // Subscribe to InfoBubble entries; re-render bubbles on change.
        // Mirrors the bubbles.forEach block in Android's MapViewBase.kt.
        const bubbleUnsub = scope.bubbleCollector.subscribe((map) => {
          setBubbleEntries(Array.from(map.values()));
        });
        bridgeUnsubs.current.push(bubbleUnsub);

        // Route Drop/Bounce animations to the screen-space overlay instead of
        // interpolating geo coordinates. Mirrors Android's
        // setMarkerAnimationOverlayHost wiring in MapViewBase.kt.
        typedControllerRef.current.setMarkerAnimationOverlayHost(scope.markerAnimationStore.start);
        bridgeUnsubs.current.push(() => typedControllerRef.current?.setMarkerAnimationOverlayHost(null));
        const animationUnsub = scope.markerAnimationStore.subscribe(setAnimationEntries);
        bridgeUnsubs.current.push(animationUnsub);

        // Mirrors Android's MapViewBase.kt DisposableEffect(controller) block.
        // Each collector subscribes to per-state observables (asObservable / asFlow).
        // When a fingerprint changes, the targeted update*() is called instead of
        // triggering a full composition() over all entities.
        const c = ctrl as unknown as Record<string, (s: never) => unknown>;
        const setupUpdateHandler = <S extends { id: string }>(
          collector: OverlayCollector<S>,
          hasMethod: string,
          updateMethod: string,
        ) => {
          collector.setUpdateHandler((state) => {
            if ((c[hasMethod] as (s: S) => boolean)?.(state)) {
              void (c[updateMethod] as (s: S) => Promise<void>)?.(state);
            }
          });
          bridgeUnsubs.current.push(() => collector.setUpdateHandler(null));
        };

        setupUpdateHandler(scope.markerCollector, 'hasMarker', 'updateMarker');
        setupUpdateHandler(scope.circleCollector, 'hasCircle', 'updateCircle');
        setupUpdateHandler(scope.polylineCollector, 'hasPolyline', 'updatePolyline');
        setupUpdateHandler(scope.polygonCollector, 'hasPolygon', 'updatePolygon');
        setupUpdateHandler(scope.groundImageCollector, 'hasGroundImage', 'updateGroundImage');
        setupUpdateHandler(scope.rasterLayerCollector, 'hasRasterLayer', 'updateRasterLayer');

        setIsReady(true);
      })
      .catch((error) => {
        // Intentional cleanup by destroy() before load — happens in React Strict Mode.
        // The second effect invocation will re-initialize successfully.
        if (MapLibreProvider.isDestroyedBeforeLoad(error)) return;
        console.error('Failed to initialize MapLibre:', error);
        onError?.(error);
      });

    return () => {
      state.setCameraPositionChangeListener(null);
      state.setController(null);
      typedControllerRef.current = null;
      bridgeUnsubs.current.forEach((unsub) => unsub());
      bridgeUnsubs.current = [];
      provider.destroy();
    };
  }, [state.mapDesignType.styleJsonURL]);

  // cameraTick is read here only to force a re-render when the camera moves,
  // so that toScreenOffset() recalculates bubble positions.
  void cameraTick;

  return (
    <MapContext.Provider value={{ controller, isReady }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          ...containerStyle,
        }}
      >
        <div
          ref={containerRef}
          className={className}
          style={{ width: '100%', height: '100%' }}
        />
        {animationEntries.length > 0 && typedControllerRef.current && (
          <MarkerAnimationLayer
            entries={animationEntries}
            resolveScreenOffset={(entry) => typedControllerRef.current!.holder.toScreenOffset(entry.state.position)}
          />
        )}
        {bubbleEntries.length > 0 && typedControllerRef.current && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {bubbleEntries.map(entry => {
              const holder = typedControllerRef.current!.holder;
              const pos = entry.positionProvider();
              const screenOffset = holder.toScreenOffset(pos);
              const icon = entry.icon;
              const iconPixelSize = icon ? icon.iconSize * icon.scale : 0;
              return (
                <InfoBubbleOverlay
                  key={entry.id}
                  positionOffset={screenOffset}
                  iconSize={{ width: iconPixelSize, height: iconPixelSize }}
                  iconOffset={icon ? icon.anchor : { x: 0.5, y: 0.5 }}
                  infoAnchorOffset={icon ? icon.infoAnchor : { x: 0.5, y: 0.5 }}
                  tailOffset={entry.tailOffset}
                  style={{ pointerEvents: 'auto' }}
                >
                  {entry.content as ReactNode}
                </InfoBubbleOverlay>
              );
            })}
          </div>
        )}
      </div>
      <MapViewScopeProvider scope={scope}>
        {children}
      </MapViewScopeProvider>
    </MapContext.Provider>
  );
}
