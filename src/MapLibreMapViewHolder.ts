import maplibregl from 'maplibre-gl';
import {
  createGeoPoint,
  MapViewHolderBase,
  type GeoPoint,
  type GeoPointInterface,
  type Offset,
} from '@mapconductor/js-sdk-core';
import type { MapLibreViewController } from './MapLibreViewController';

export class MapLibreMapViewHolder extends MapViewHolderBase<HTMLElement, maplibregl.Map> {
  private _controller: MapLibreViewController | null = null;

  constructor(
    readonly mapView: HTMLElement,
    readonly map: maplibregl.Map,
  ) {
    super();
  }

  getController(): MapLibreViewController | null {
    return this._controller;
  }

  setController(controller: MapLibreViewController): void {
    this._controller = controller;
  }

  toScreenOffset(position: GeoPointInterface): Offset {
    const point = this.map.project([position.longitude, position.latitude]);
    return { x: point.x, y: point.y };
  }

  async fromScreenOffset(offset: Offset): Promise<GeoPoint | null> {
    return this.fromScreenOffsetSync(offset);
  }

  fromScreenOffsetSync(offset: Offset): GeoPoint {
    const lngLat = this.map.unproject([offset.x, offset.y]);
    return createGeoPoint({ latitude: lngLat.lat, longitude: lngLat.lng });
  }
}
