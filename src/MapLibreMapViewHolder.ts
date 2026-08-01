import * as maplibregl from 'maplibre-gl';
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
    // project() maps longitude literally and does NOT pick the world copy
    // nearest the viewport, so when the map is panned across the antimeridian a
    // wrapped position projects ~360° off-screen and screen-space overlays
    // (marker drop/bounce animations, info bubbles) render off-view. Shift the
    // longitude into the same world copy as the current center before projecting.
    const centerLng = this.map.getCenter().lng;
    const lng = position.longitude + 360 * Math.round((centerLng - position.longitude) / 360);
    const point = this.map.project([lng, position.latitude]);
    return { x: point.x, y: point.y };
  }

  fromScreenOffsetSync(offset: Offset): GeoPoint {
    const lngLat = this.map.unproject([offset.x, offset.y]);
    return createGeoPoint({ latitude: lngLat.lat, longitude: lngLat.lng });
  }
}
