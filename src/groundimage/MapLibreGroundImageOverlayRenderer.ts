import type { LayerSpecification, SourceSpecification } from 'maplibre-gl';
import {
  AbstractGroundImageOverlayRenderer,
  type GroundImageEntity,
  type GroundImageState,
} from '@mapconductor/js-sdk-core';
import { bringMarkerLayersToFront, groundImageCoordinates, removeLayerIfExists, removeSourceIfExists } from '../helpers';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';

// ActualGroundImage = string (stateId)
export class MapLibreGroundImageOverlayRenderer extends AbstractGroundImageOverlayRenderer<
  MapLibreMapViewHolder,
  string
> {
  private readonly canEditStyle: () => boolean;

  constructor({
    holder,
    canEditStyle,
  }: {
    holder: MapLibreMapViewHolder;
    canEditStyle: () => boolean;
  }) {
    super(holder);
    this.canEditStyle = canEditStyle;
  }

  sourceId(id: string): string { return `mc-gimg-src-${id}`; }
  layerId(id: string): string { return `mc-gimg-lyr-${id}`; }

  async createGroundImage(state: GroundImageState): Promise<string | null> {
    if (!this.canEditStyle()) return null;

    const coordinates = groundImageCoordinates(state);
    if (!coordinates) return null;

    const sourceId = this.sourceId(state.id);
    const layerId = this.layerId(state.id);

    if (!this.holder.map.getSource(sourceId)) {
      this.holder.map.addSource(sourceId, {
        type: 'image',
        url: state.imageUrl,
        coordinates,
      } as SourceSpecification);
    }
    if (!this.holder.map.getLayer(layerId)) {
      this.holder.map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: { 'raster-opacity': state.opacity },
      } as LayerSpecification);
    }
    bringMarkerLayersToFront(this.holder.map);

    return state.id;
  }

  async updateGroundImageProperties({
    groundImage,
    current,
    prev,
  }: {
    groundImage: string;
    current: GroundImageEntity<string>;
    prev: GroundImageEntity<string>;
  }): Promise<string | null> {
    // Image sources in MapLibre cannot be updated — remove and recreate
    await this.removeGroundImage({ groundImage, state: prev.state, fingerPrint: prev.fingerPrint });
    return this.createGroundImage(current.state);
  }

  async removeGroundImage(entity: GroundImageEntity<string>): Promise<void> {
    if (!this.canEditStyle()) return;
    removeLayerIfExists(this.holder.map, this.layerId(entity.groundImage));
    removeSourceIfExists(this.holder.map, this.sourceId(entity.groundImage));
  }
}
