import type { LayerSpecification } from 'maplibre-gl';
import { type RasterLayerState } from '@mapconductor/js-sdk-core';
import { bringMarkerLayersToFront, createRasterSource, removeLayerIfExists, removeSourceIfExists } from '../helpers';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';

export class MapLibreRasterLayerOverlayRenderer {
  constructor(
    readonly holder: MapLibreMapViewHolder,
    private readonly canEditStyle: () => boolean,
  ) {}

  sourceId(id: string): string { return `mc-raster-src-${id}`; }
  layerId(id: string): string { return `mc-raster-lyr-${id}`; }

  upsert(state: RasterLayerState, recreate: boolean): void {
    if (!this.canEditStyle()) return;

    const sourceId = this.sourceId(state.id);
    const layerId = this.layerId(state.id);

    if (recreate) {
      removeLayerIfExists(this.holder.map, layerId);
      removeSourceIfExists(this.holder.map, sourceId);
    }

    if (!this.holder.map.getSource(sourceId)) {
      this.holder.map.addSource(sourceId, createRasterSource(state.source));
    }

    if (!this.holder.map.getLayer(layerId)) {
      this.holder.map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: { 'raster-opacity': state.visible ? state.opacity : 0 },
      } as LayerSpecification);
    } else {
      this.holder.map.setPaintProperty(layerId, 'raster-opacity', state.visible ? state.opacity : 0);
    }
    bringMarkerLayersToFront(this.holder.map);
  }

  remove(id: string): void {
    if (!this.canEditStyle()) return;
    removeLayerIfExists(this.holder.map, this.layerId(id));
    removeSourceIfExists(this.holder.map, this.sourceId(id));
  }
}
