import {
  AbstractPolylineOverlayRenderer,
  createInterpolatePoints,
  createLinearInterpolatePoints,
  splitByMeridian,
  type GeoPoint,
  type PolylineEntity,
  type PolylineManagerInterface,
  type PolylineState,
} from '@mapconductor/core';
import type { LineFeature } from '../helpers';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';
import {
  MapLibrePolylineLayer,
  type MapLibreActualPolyline,
} from './MapLibrePolylineLayer';

export class MapLibrePolylineOverlayRenderer extends AbstractPolylineOverlayRenderer<
  MapLibreMapViewHolder,
  MapLibreActualPolyline
> {
  readonly layer: MapLibrePolylineLayer;
  readonly polylineManager: PolylineManagerInterface<MapLibreActualPolyline>;

  constructor({
    layer,
    polylineManager,
    holder,
  }: {
    layer: MapLibrePolylineLayer;
    polylineManager: PolylineManagerInterface<MapLibreActualPolyline>;
    holder: MapLibreMapViewHolder;
  }) {
    super(holder);
    this.layer = layer;
    this.polylineManager = polylineManager;
  }

  async createPolyline(state: PolylineState): Promise<MapLibreActualPolyline | null> {
    if (state.points.length < 2) return null;
    return createMapLibreLines(state, this.resolveZIndex(state));
  }

  async updatePolylineProperties({
    current,
  }: {
    polyline: MapLibreActualPolyline;
    current: PolylineEntity<MapLibreActualPolyline>;
    prev: PolylineEntity<MapLibreActualPolyline>;
  }): Promise<MapLibreActualPolyline | null> {
    return this.createPolyline(current.state);
  }

  async removePolyline(_entity: PolylineEntity<MapLibreActualPolyline>): Promise<void> {
    // The source is rewritten from the remaining manager entities in onPostProcess().
  }

  override async onPostProcess(): Promise<void> {
    this.layer.draw(this.polylineManager.allEntities());
  }

  async redraw(): Promise<void> {
    await this.onPostProcess();
  }

  private resolveZIndex(state: PolylineState): number {
    if (state.zIndex !== 0) return state.zIndex;
    return typeof state.extra === 'number' ? state.extra : 0;
  }
}

function createMapLibreLines(
  state: PolylineState,
  zIndex: number,
): MapLibreActualPolyline {
  const points = interpolateAndNormalize(state.points, state.geodesic);

  return splitByMeridian(points, state.geodesic)
    .filter((line) => line.length >= 2)
    .map((line, index): LineFeature => ({
      type: 'Feature',
      id: `polyline-${state.id}-${index}`,
      geometry: {
        type: 'LineString',
        coordinates: line.map((point) => [point.longitude, point.latitude]),
      },
      properties: {
        id: `polyline-${state.id}-${index}`,
        [MapLibrePolylineLayer.Prop.STROKE_COLOR]: state.strokeColor,
        [MapLibrePolylineLayer.Prop.STROKE_WIDTH]: state.strokeWidth,
        [MapLibrePolylineLayer.Prop.Z_INDEX]: zIndex,
      },
    }));
}

function interpolateAndNormalize(points: GeoPoint[], geodesic: boolean): GeoPoint[] {
  const interpolated = geodesic
    ? createInterpolatePoints(points)
    : createLinearInterpolatePoints(points);
  return interpolated.map((point) => point.normalize());
}
