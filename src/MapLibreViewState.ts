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
    // Applied live. The map keeps its tiles, camera and every overlay the
    // app added; only the style document changes. Tearing the map down for
    // this is the cost the vector style design exists to avoid -- its direct
    // path *is* a design change, and it may happen on every slider frame.
    // android の `setMapDesignType` → `map.setStyle` と同じ位置づけ。
    const controller = this.attachedMapController as { setMapDesignType?: (design: MapLibreMapDesignType) => void } | null;
    controller?.setMapDesignType?.(value);
  }

  // Called by MapLibreView when controller is initialized

  // Called by MapLibreView when camera position changes

}

export function useMapLibreViewState(params: MapLibreViewStateParams = {}): MapLibreViewStateInterface {
  const [state] = useState(() => new MapLibreViewState(params));
  return state;
}
