import {
  AbstractPolygonOverlayRenderer,
  buildUnwrappedPolygonRings,
  type GeoPoint,
  type PolygonEntity,
  type PolygonManagerInterface,
  type PolygonState,
} from '@mapconductor/js-sdk-core';
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
  // Unwrapped rings (longitudes continuous, may exceed ±180): MapLibre GL renders
  // them seamlessly across the antimeridian, so the outer ring is never split
  // and ALL holes can always be included.
  const { outerRings, holeRings } = buildUnwrappedPolygonRings(
    state.points,
    state.holes,
    state.geodesic,
  );
  if (outerRings.length === 0) return { fillFeatures: [], outlineFeatures: [] };

  const outer = closeCoordinates(outerRings[0]);
  if (outer.length < 4) return { fillFeatures: [], outlineFeatures: [] };
  const holes = holeRings
    .map((hole) => closeCoordinates(hole))
    .filter((hole) => hole.length >= 4);

  const fillFeatures: PolygonFeature[] = [
    {
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
    },
  ];

  const outlineFeatures: LineFeature[] = [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: outer,
      },
      properties: {
        id: `outline-${state.id}`,
        [MapLibrePolygonLayer.Prop.STROKE_COLOR]: state.strokeColor,
        [MapLibrePolygonLayer.Prop.STROKE_WIDTH]: state.strokeWidth,
        [MapLibrePolygonLayer.Prop.Z_INDEX]: state.zIndex,
      },
    },
  ];

  return { fillFeatures, outlineFeatures };
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

function sameCoordinate(a: Coordinate, b: Coordinate): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
