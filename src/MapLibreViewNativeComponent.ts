import type { HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';
import type { GeoPoint, MapCameraPosition } from '@mapconductor/js-sdk-core';

export interface NativeMapLibreViewEvent<T> {
  nativeEvent: T;
}

export interface NativeMapLibreViewProps extends ViewProps {
  cameraPosition?: {
    position: {
      latitude: number;
      longitude: number;
      altitude?: number | null;
    };
    zoom: number;
    bearing: number;
    tilt: number;
  };
  mapDesignType?: string;
  infoBubblePositions?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    altitude?: number | null;
  }>;
  onMapLoaded?: () => void;
  onMapClick?: (event: NativeMapLibreViewEvent<{ point: GeoPoint }>) => void;
  onMapLongClick?: (event: NativeMapLibreViewEvent<{ point: GeoPoint }>) => void;
  onCameraMoveStart?: (
    event: NativeMapLibreViewEvent<{ cameraPosition: MapCameraPosition }>
  ) => void;
  onCameraMove?: (event: NativeMapLibreViewEvent<{ cameraPosition: MapCameraPosition }>) => void;
  onCameraMoveEnd?: (event: NativeMapLibreViewEvent<{ cameraPosition: MapCameraPosition }>) => void;
  onMarkerClick?: (event: NativeMapLibreViewEvent<{ markerId: string }>) => void;
  onMarkerDragStart?: (
    event: NativeMapLibreViewEvent<{ markerId: string; point: GeoPoint }>
  ) => void;
  onMarkerDrag?: (event: NativeMapLibreViewEvent<{ markerId: string; point: GeoPoint }>) => void;
  onMarkerDragEnd?: (event: NativeMapLibreViewEvent<{ markerId: string; point: GeoPoint }>) => void;
  onMarkerScreenPositions?: (
    event: NativeMapLibreViewEvent<{
      positions: Array<{ markerId: string; x: number; y: number }>;
    }>
  ) => void;
  onInfoBubbleScreenPositions?: (
    event: NativeMapLibreViewEvent<{
      positions: Array<{ id: string; x: number; y: number }>;
    }>
  ) => void;
}

export function toNativeCameraPosition(cameraPosition: MapCameraPosition | undefined) {
  if (!cameraPosition) return undefined;

  return {
    position: {
      latitude: cameraPosition.position.latitude,
      longitude: cameraPosition.position.longitude,
      altitude: cameraPosition.position.altitude ?? 0,
    },
    zoom: cameraPosition.zoom,
    bearing: cameraPosition.bearing,
    tilt: cameraPosition.tilt,
  };
}

export default codegenNativeComponent<NativeMapLibreViewProps>(
  // Align to android/src/main/java/com/mapconductor/react/maplibre/MapConductorMapLibreViewManager.kt (REACT_CLASS)
  'MapLibreMapView'
) as HostComponent<NativeMapLibreViewProps>;
