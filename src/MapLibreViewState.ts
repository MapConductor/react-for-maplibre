import {
  useState } from 'react';
import {
  MapViewState,
  type MapViewStateInterface,
  type MapCameraPosition,
  MapCameraPosition as MapCameraPositionNS,
  createRandomId,
} from '@mapconductor/js-sdk-core';
import { MapLibreDesign, type MapLibreMapDesignType } from './MapLibreDesign';

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
  private _mapDesignType: MapLibreMapDesignType;

  constructor({
    id = createRandomId(),
    mapDesignType = MapLibreDesign.OsmBright,
    cameraPosition = MapCameraPositionNS.Default,
  }: MapLibreViewStateParams = {}) {
    super({ id, cameraPosition });
    this._mapDesignType = mapDesignType;
  }

  override get mapDesignType(): MapLibreMapDesignType {
    return this._mapDesignType;
  }

  override set mapDesignType(value: MapLibreMapDesignType) {
    this._mapDesignType = value;
  }

  // Called by MapLibreView when controller is initialized

  // Called by MapLibreView when camera position changes

  // If zoom/bearing/tilt are all 0, treat as position-only update (matches Android/iOS behavior)
}

export function useMapLibreViewState(params: MapLibreViewStateParams = {}): MapLibreViewStateInterface {
  const [state] = useState(() => new MapLibreViewState(params));
  return state;
}
