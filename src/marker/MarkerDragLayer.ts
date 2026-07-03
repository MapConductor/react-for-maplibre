import type { GeoPoint, MarkerEntity } from '@mapconductor/core';
import type { FeatureCollection } from '../helpers';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';
import {
  MarkerLayer,
  type MapLibreActualMarker,
} from './MarkerLayer';

export class MarkerDragLayer extends MarkerLayer {
  selected: MarkerEntity<MapLibreActualMarker> | null = null;

  constructor({
    holder,
    canEditStyle,
    sourceId,
    layerId,
  }: {
    holder: MapLibreMapViewHolder;
    canEditStyle: () => boolean;
    sourceId: string;
    layerId: string;
  }) {
    super({ holder, canEditStyle, sourceId, layerId });
  }

  updatePosition(position: GeoPoint): void {
    const selected = this.selected;
    if (!selected) return;

    selected.state.position = position;
    if (selected.marker) {
      selected.marker = {
        ...selected.marker,
        id: selected.state.id,
        geometry: {
          type: 'Point',
          coordinates: [position.longitude, position.latitude],
        },
        properties: { ...selected.marker.properties },
      };
    }
  }

  drawSelected(): boolean {
    if (!this.ensureStyleResources()) return false;

    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: this.selected?.marker ? [this.selected.marker] : [],
    };
    return this.setData(data);
  }
}
