import type {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
} from 'maplibre-gl';
import type { MarkerEntity } from '@mapconductor/core';
import { bringMarkerLayersToFront, type FeatureCollection, type PointFeature } from '../helpers';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';

export type MapLibreActualMarker = PointFeature;

export const MapLibreMarkerProp = {
  ID: 'mc-id',
  ICON_ID: 'mc-icon-id',
  ICON_OFFSET: 'mc-offset',
  Z_INDEX: 'mc-z-index',
} as const;

export class MarkerLayer {
  protected readonly holder: MapLibreMapViewHolder;
  protected readonly canEditStyle: () => boolean;
  readonly sourceId: string;
  readonly layerId: string;

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
    this.holder = holder;
    this.canEditStyle = canEditStyle;
    this.sourceId = sourceId;
    this.layerId = layerId;
  }

  draw(entities: MarkerEntity<MapLibreActualMarker>[]): boolean {
    if (!this.ensureStyleResources()) return false;

    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: entities
        .filter((entity) => entity.visible && entity.marker != null)
        .map((entity) => entity.marker!),
    };

    return this.setData(data);
  }

  ensureStyleResources(): boolean {
    const map = this.holder.map;
    const needsSetup = !map.getSource(this.sourceId) || !map.getLayer(this.layerId);
    if (needsSetup && !this.canEditStyle()) return false;

    try {
      if (!map.getSource(this.sourceId)) {
        map.addSource(this.sourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.getLayer(this.layerId)) {
        map.addLayer({
          id: this.layerId,
          type: 'symbol',
          source: this.sourceId,
          layout: {
            'icon-image': ['get', MapLibreMarkerProp.ICON_ID],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'symbol-sort-key': ['get', MapLibreMarkerProp.Z_INDEX],
            'icon-anchor': 'top-left',
            'icon-offset': ['get', MapLibreMarkerProp.ICON_OFFSET] as ExpressionSpecification,
          },
          paint: {
            'icon-translate-anchor': 'map',
          },
        } as LayerSpecification);
      }
      bringMarkerLayersToFront(map);
    } catch {
      return false;
    }

    return map.getSource(this.sourceId) != null && map.getLayer(this.layerId) != null;
  }

  protected setData(data: FeatureCollection): boolean {
    try {
      const source = this.holder.map.getSource(this.sourceId) as GeoJSONSource | undefined;
      if (!source) return false;
      source.setData(data);
      return true;
    } catch {
      return false;
    }
  }
}
