import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GeoPoint, MapCameraPosition } from '@mapconductor/js-sdk-core';
import {
  InfoBubbleLayer,
  MapViewScope,
  MapViewScopeProvider,
  type InfoBubblePositionRequest,
  type InfoBubbleScreenPositionMap,
  type MarkerScreenPositionMap,
  useCollectAndRenderOverlays,
} from '@mapconductor/js-sdk-react/native';
import { MapLibreViewController } from './MapLibreViewController.native';
import type { MapLibreViewProps } from './MapLibreViewProps.native';
import NativeMapLibreView, {
  toNativeCameraPosition,
  toNativeMarkerTilingOptions,
} from './MapLibreViewNativeComponent';

export function MapLibreView({
  state,
  style,
  onMapLoaded,
  onMapClick,
  onMapLongClick,
  onCameraMoveStart,
  onCameraMove,
  onCameraMoveEnd,
  markerTilingOptions,
  children,
}: MapLibreViewProps) {
  const nativeRef = useRef<React.ComponentRef<typeof NativeMapLibreView> | null>(null);
  const scope = useMemo(() => new MapViewScope(), []);
  const registry = useMemo(() => scope.buildRegistry(), [scope]);
  const initialCameraPositionRef = useRef(state.cameraPosition);
  const onMapLoadedRef = useRef(onMapLoaded);
  const onMapClickRef = useRef(onMapClick);
  const onMapLongClickRef = useRef(onMapLongClick);
  const onCameraMoveStartRef = useRef(onCameraMoveStart);
  const onCameraMoveRef = useRef(onCameraMove);
  const onCameraMoveEndRef = useRef(onCameraMoveEnd);
  const [controller] = useState(() => new MapLibreViewController(nativeRef, state.cameraPosition));
  const [markerScreenPositions, setMarkerScreenPositions] = useState<MarkerScreenPositionMap>(
    () => new Map()
  );
  const [infoBubblePositions, setInfoBubblePositions] = useState<InfoBubblePositionRequest[]>([]);
  const [infoBubbleScreenPositions, setInfoBubbleScreenPositions] =
    useState<InfoBubbleScreenPositionMap>(() => new Map());

  useCollectAndRenderOverlays(registry, controller);

  useEffect(() => {
    scope.markerCollector.setUpdateHandler((marker) => {
      if (controller.hasMarker(marker)) {
        void controller.updateMarker(marker);
      }
    });

    return () => {
      scope.markerCollector.setUpdateHandler(null);
    };
  }, [controller, scope]);

  onMapLoadedRef.current = onMapLoaded;
  onMapClickRef.current = onMapClick;
  onMapLongClickRef.current = onMapLongClick;
  onCameraMoveStartRef.current = onCameraMoveStart;
  onCameraMoveRef.current = onCameraMove;
  onCameraMoveEndRef.current = onCameraMoveEnd;

  useEffect(() => {
    state.setController(controller);
    state.setMapViewHolder(controller.holder);

    controller.setMapInitializedListener(() => onMapLoadedRef.current?.(state));
    controller.setMapClickListener((point) => onMapClickRef.current?.(point));
    controller.setMapLongClickListener((point) => onMapLongClickRef.current?.(point));
    controller.setCameraMoveStartListener((camera) => {
      state.updateCameraPosition(camera);
      onCameraMoveStartRef.current?.(camera);
    });
    controller.setCameraMoveListener((camera) => {
      state.updateCameraPosition(camera);
      onCameraMoveRef.current?.(camera);
    });
    controller.setCameraMoveEndListener((camera) => {
      state.updateCameraPosition(camera);
      onCameraMoveEndRef.current?.(camera);
    });

    return () => {
      state.setController(null);
      state.setMapViewHolder(null);
      controller.destroy();
    };
  }, [controller, state]);

  return (
    <MapViewScopeProvider scope={scope}>
      <View style={style ?? { flex: 1 }}>
        <NativeMapLibreView
          ref={nativeRef}
          style={StyleSheet.absoluteFill}
          cameraPosition={toNativeCameraPosition(initialCameraPositionRef.current)}
          mapDesignType={state.mapDesignType.getValue()}
          markerTilingOptions={toNativeMarkerTilingOptions(markerTilingOptions)}
          infoBubblePositions={infoBubblePositions}
          onMapLoaded={() => controller.onNativeMapLoaded()}
          onMapClick={(event) => controller.onNativeMapClick(GeoPoint.from(event.nativeEvent.point))}
          onMapLongClick={(event) =>
            controller.onNativeMapLongClick(GeoPoint.from(event.nativeEvent.point))
          }
          onCameraMoveStart={(event) =>
            controller.onNativeCameraMoveStart(
              MapCameraPosition.from(event.nativeEvent.cameraPosition)
            )
          }
          onCameraMove={(event) =>
            controller.onNativeCameraMove(MapCameraPosition.from(event.nativeEvent.cameraPosition))
          }
          onCameraMoveEnd={(event) =>
            controller.onNativeCameraMoveEnd(MapCameraPosition.from(event.nativeEvent.cameraPosition))
          }
          onMarkerClick={(event) => controller.onNativeMarkerClick(event.nativeEvent.markerId)}
          onMarkerDragStart={(event) =>
            controller.onNativeMarkerDragStart(
              event.nativeEvent.markerId,
              GeoPoint.from(event.nativeEvent.point)
            )
          }
          onMarkerDrag={(event) =>
            controller.onNativeMarkerDrag(
              event.nativeEvent.markerId,
              GeoPoint.from(event.nativeEvent.point)
            )
          }
          onMarkerDragEnd={(event) =>
            controller.onNativeMarkerDragEnd(
              event.nativeEvent.markerId,
              GeoPoint.from(event.nativeEvent.point)
            )
          }
          onMarkerScreenPositions={(event) => {
            setMarkerScreenPositions(
              new Map(
                event.nativeEvent.positions.map((position) => [
                  position.markerId,
                  { x: position.x, y: position.y },
                ])
              )
            );
          }}
          onInfoBubbleScreenPositions={(event) => {
            setInfoBubbleScreenPositions(
              new Map(
                event.nativeEvent.positions.map((position) => [
                  position.id,
                  { x: position.x, y: position.y },
                ])
              )
            );
          }}
        />
        <InfoBubbleLayer
          scope={scope}
          markerScreenPositions={markerScreenPositions}
          infoBubbleScreenPositions={infoBubbleScreenPositions}
          onPositionRequestsChange={setInfoBubblePositions}
        />
        {children}
      </View>
    </MapViewScopeProvider>
  );
}
