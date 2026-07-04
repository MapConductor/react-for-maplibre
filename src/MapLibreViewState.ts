import { useState } from 'react';
import {
  MapViewState,
  type MapViewStateInterface,
  type GeoPoint,
  type MapCameraPosition,
  type MapViewControllerInterface,
  type MapViewHolder,
  MapCameraPosition as MapCameraPositionNS,
  createRandomId,
} from '@mapconductor/js-sdk-core';
import { MapLibreDesign, type MapLibreMapDesignType } from './MapLibreDesign';
import type { MapLibreMapViewHolder } from './MapLibreMapViewHolder';

export interface MapLibreViewStateInterface
  extends MapViewStateInterface<MapLibreMapDesignType> {}

export interface MapLibreViewStateParams {
  id?: string;
  mapDesignType?: MapLibreMapDesignType;
  cameraPosition?: MapCameraPosition;
}

export class MapLibreViewState
  extends MapViewState<MapLibreMapDesignType>
  implements MapLibreViewStateInterface {
  readonly id: string;
  private _cameraPosition: MapCameraPosition;
  private _mapDesignType: MapLibreMapDesignType;
  private _controller: MapViewControllerInterface | null = null;
  private _holder: MapLibreMapViewHolder | null = null;
  private _cameraPositionChangeListener: ((camera: MapCameraPosition) => void) | null = null;

  constructor({
    id = createRandomId(),
    mapDesignType = MapLibreDesign.OsmBright,
    cameraPosition = MapCameraPositionNS.Default,
  }: MapLibreViewStateParams = {}) {
    super();
    this.id = id;
    this._cameraPosition = cameraPosition;
    this._mapDesignType = mapDesignType;
  }

  override get cameraPosition(): MapCameraPosition {
    return this._cameraPosition;
  }

  override get mapDesignType(): MapLibreMapDesignType {
    return this._mapDesignType;
  }

  override set mapDesignType(value: MapLibreMapDesignType) {
    this._mapDesignType = value;
  }

  override moveCameraTo(position: GeoPoint, durationMillis?: number): void;
  override moveCameraTo(cameraPosition: MapCameraPosition, durationMillis?: number): void;
  override moveCameraTo(positionOrCamera: GeoPoint | MapCameraPosition, durationMillis?: number): void {
    const newPosition = 'zoom' in positionOrCamera
      ? this.resolveCameraPosition(positionOrCamera as MapCameraPosition)
      : this._cameraPosition.copy({ position: positionOrCamera as GeoPoint });

    const ctrl = this._controller;
    if (!ctrl) {
      this._cameraPosition = newPosition;
      return;
    }

    if (!durationMillis || durationMillis === 0) {
      ctrl.moveCamera(newPosition);
    } else {
      void ctrl.animateCamera(newPosition, { duration: durationMillis });
    }
    this._cameraPosition = newPosition;
    this._cameraPositionChangeListener?.(newPosition);
  }

  override getMapViewHolder(): MapViewHolder<unknown, unknown> | null {
    return this._holder;
  }

  // Called by MapLibreView when controller is initialized
  setController(ctrl: MapViewControllerInterface | null): void {
    this._controller = ctrl;
    if (ctrl) ctrl.moveCamera(this._cameraPosition);
  }

  // Called by MapLibreView when map view holder is available
  setMapViewHolder(holder: MapLibreMapViewHolder | null): void {
    this._holder = holder;
  }

  // Called by MapLibreView when camera position changes
  updateCameraPosition(camera: MapCameraPosition): void {
    this._cameraPosition = camera;
    this._cameraPositionChangeListener?.(camera);
  }

  setCameraPositionChangeListener(listener: ((camera: MapCameraPosition) => void) | null): void {
    this._cameraPositionChangeListener = listener;
  }

  // If zoom/bearing/tilt are all 0, treat as position-only update (matches Android/iOS behavior)
  private resolveCameraPosition(target: MapCameraPosition): MapCameraPosition {
    const isUnspecified = target.zoom === 0 && target.bearing === 0 && target.tilt === 0;
    if (isUnspecified) return this._cameraPosition.copy({ position: target.position });
    return target;
  }
}

export function useMapLibreViewState(params: MapLibreViewStateParams = {}): MapLibreViewState {
  const [state] = useState(() => new MapLibreViewState(params));
  return state;
}
