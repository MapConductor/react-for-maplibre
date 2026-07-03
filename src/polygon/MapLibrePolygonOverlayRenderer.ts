import {
  AbstractPolygonOverlayRenderer,
  createInterpolatePoints,
  createLinearInterpolatePoints,
  splitByMeridian,
  type GeoPoint,
  type PolygonEntity,
  type PolygonManagerInterface,
  type PolygonState,
} from '@mapconductor/core';
import type { Coordinate, LineFeature, PolygonFeature } from '../helpers';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';
import {
  MapLibrePolygonLayer,
  type MapLibreActualPolygon,
} from './MapLibrePolygonLayer';

export class MapLibrePolygonOverlayRenderer extends AbstractPolygonOverlayRenderer<
  MapLibreMapViewHolder,
  MapLibreActualPolygon
> {
  readonly layer: MapLibrePolygonLayer;
  readonly polygonManager: PolygonManagerInterface<MapLibreActualPolygon>;

  constructor({
    layer,
    polygonManager,
    holder,
  }: {
    layer: MapLibrePolygonLayer;
    polygonManager: PolygonManagerInterface<MapLibreActualPolygon>;
    holder: MapLibreMapViewHolder;
  }) {
    super(holder);
    this.layer = layer;
    this.polygonManager = polygonManager;
  }

  async createPolygon(state: PolygonState): Promise<MapLibreActualPolygon | null> {
    if (state.points.length < 3) return null;
    return createMapLibrePolygon(state);
  }

  async updatePolygonProperties({
    current,
  }: {
    polygon: MapLibreActualPolygon;
    current: PolygonEntity<MapLibreActualPolygon>;
    prev: PolygonEntity<MapLibreActualPolygon>;
  }): Promise<MapLibreActualPolygon | null> {
    return this.createPolygon(current.state);
  }

  async removePolygon(_entity: PolygonEntity<MapLibreActualPolygon>): Promise<void> {
    // The source is rewritten from the remaining manager entities in onPostProcess().
  }

  override async onPostProcess(): Promise<void> {
    this.layer.draw(this.polygonManager.allEntities());
  }
}

function createMapLibrePolygon(state: PolygonState): MapLibreActualPolygon {
  const outerPoints = interpolateAndNormalize(state.points, state.geodesic);
  const outerRings = splitByMeridian(outerPoints, state.geodesic);
  const includeHoles = state.holes.length > 0 && outerRings.length === 1;
  const holes = includeHoles
    ? state.holes
        .map((hole) => closeCoordinates(interpolateAndNormalize(hole, state.geodesic)))
        .filter((hole) => hole.length >= 4)
    : [];

  const fillFeatures: PolygonFeature[] = outerRings
    .map((ring): PolygonFeature | null => {
      const outer = closeCoordinates(ring);
      if (outer.length < 4) return null;
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [outer, ...holes],
        },
        properties: {
          id: state.id,
          [MapLibrePolygonLayer.Prop.FILL_COLOR]: state.fillColor,
          [MapLibrePolygonLayer.Prop.Z_INDEX]: state.zIndex,
        },
      };
    })
    .filter((feature): feature is PolygonFeature => feature != null);

  const closedOutline = closePoints(state.points);
  const outlinePoints = interpolateAndNormalize(closedOutline, state.geodesic);
  const outlineFeatures: LineFeature[] = splitByMeridian(outlinePoints, state.geodesic)
    .filter((line) => line.length >= 2)
    .map((line): LineFeature => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: line.map(toCoordinate),
      },
      properties: {
        id: `outline-${state.id}`,
        [MapLibrePolygonLayer.Prop.STROKE_COLOR]: state.strokeColor,
        [MapLibrePolygonLayer.Prop.STROKE_WIDTH]: state.strokeWidth,
        [MapLibrePolygonLayer.Prop.Z_INDEX]: state.zIndex,
      },
    }));

  return { fillFeatures, outlineFeatures };
}

function interpolateAndNormalize(points: GeoPoint[], geodesic: boolean): GeoPoint[] {
  if (points.length === 0) return [];
  const interpolated = geodesic
    ? createInterpolatePoints(points)
    : createLinearInterpolatePoints(points);
  return interpolated.map((point) => point.normalize());
}

function closePoints(points: GeoPoint[]): GeoPoint[] {
  if (points.length === 0 || samePoint(points[0], points[points.length - 1])) return points;
  return [...points, points[0]];
}

function closeCoordinates(points: GeoPoint[]): Coordinate[] {
  if (points.length === 0) return [];
  const coordinates = points.map(toCoordinate);
  if (!sameCoordinate(coordinates[0], coordinates[coordinates.length - 1])) {
    coordinates.push(coordinates[0]);
  }
  return coordinates;
}

function toCoordinate(point: GeoPoint): Coordinate {
  return [point.longitude, point.latitude];
}

function samePoint(a: GeoPoint, b: GeoPoint): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function sameCoordinate(a: Coordinate, b: Coordinate): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
