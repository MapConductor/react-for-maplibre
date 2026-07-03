import {
  AbstractCircleOverlayRenderer,
  type CircleEntity,
  type CircleManagerInterface,
  type CircleState,
} from '@mapconductor/core';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';
import {
  MapLibreCircleLayer,
  type MapLibreActualCircle,
} from './MapLibreCircleLayer';

export class MapLibreCircleOverlayRenderer extends AbstractCircleOverlayRenderer<
  MapLibreMapViewHolder,
  MapLibreActualCircle
> {
  readonly layer: MapLibreCircleLayer;
  readonly circleManager: CircleManagerInterface<MapLibreActualCircle>;

  constructor({
    layer,
    circleManager,
    holder,
  }: {
    layer: MapLibreCircleLayer;
    circleManager: CircleManagerInterface<MapLibreActualCircle>;
    holder: MapLibreMapViewHolder;
  }) {
    super(holder);
    this.layer = layer;
    this.circleManager = circleManager;
  }

  async createCircle(state: CircleState): Promise<MapLibreActualCircle | null> {
    return createMapLibreCircle(state);
  }

  async updateCircleProperties({
    current,
  }: {
    circle: MapLibreActualCircle;
    current: CircleEntity<MapLibreActualCircle>;
    prev: CircleEntity<MapLibreActualCircle>;
  }): Promise<MapLibreActualCircle | null> {
    return this.createCircle(current.state);
  }

  async removeCircle(_entity: CircleEntity<MapLibreActualCircle>): Promise<void> {
    // The source is rewritten from the remaining manager entities in onPostProcess().
  }

  override async onPostProcess(): Promise<void> {
    this.layer.draw(this.circleManager.allEntities());
  }

  async redraw(): Promise<void> {
    await this.onPostProcess();
  }
}

function createMapLibreCircle(state: CircleState): MapLibreActualCircle {
  const latitudeCorrection = state.geodesic
    ? Math.cos(state.center.latitude * Math.PI / 180)
    : 1;
  const zIndex = state.zIndex ?? calculateZIndex(state.center.latitude, state.center.longitude);

  return {
    type: 'Feature',
    id: `circle-${state.id}`,
    geometry: {
      type: 'Point',
      coordinates: [state.center.longitude, state.center.latitude],
    },
    properties: {
      id: `circle-${state.id}`,
      [MapLibreCircleLayer.Prop.LATITUDE_CORRECTION]: latitudeCorrection,
      [MapLibreCircleLayer.Prop.RADIUS]: state.radiusMeters,
      [MapLibreCircleLayer.Prop.FILL_COLOR]: state.fillColor,
      [MapLibreCircleLayer.Prop.STROKE_COLOR]: state.strokeColor,
      [MapLibreCircleLayer.Prop.STROKE_WIDTH]: state.strokeWidth,
      [MapLibreCircleLayer.Prop.Z_INDEX]: zIndex,
    },
  };
}

function calculateZIndex(latitude: number, longitude: number): number {
  return Math.round(-latitude * 1_000_000 - longitude);
}
