import type { ImageSource, LayerSpecification, SourceSpecification } from 'maplibre-gl';
import {
  AbstractGroundImageOverlayRenderer,
  type GroundImageEntity,
  type GroundImageState,
} from '@mapconductor/js-sdk-core';
import { bringMarkerLayersToFront, groundImageCoordinates, removeLayerIfExists, removeSourceIfExists } from '../helpers';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';

type ImageCoordinates = Parameters<ImageSource['setCoordinates']>[0];

// ActualGroundImage = string (stateId)
export class MapLibreGroundImageOverlayRenderer extends AbstractGroundImageOverlayRenderer<
  MapLibreMapViewHolder,
  string
> {
  private readonly canEditStyle: () => boolean;
  /** Last values applied to the map style, keyed by state id. */
  private readonly applied = new Map<string, { url: string; coordsKey: string; opacity: number }>();

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

    this.applied.set(state.id, {
      url: state.imageUrl,
      coordsKey: JSON.stringify(coordinates),
      opacity: state.opacity,
    });
    return state.id;
  }

  async updateGroundImageProperties({
    current,
  }: {
    groundImage: string;
    current: GroundImageEntity<string>;
    prev: GroundImageEntity<string>;
  }): Promise<string | null> {
    if (!this.canEditStyle()) return null;

    const state = current.state;
    const sourceId = this.sourceId(state.id);
    const layerId = this.layerId(state.id);
    const source = this.holder.map.getSource(sourceId) as ImageSource | undefined;

    // The style may have been swapped since creation — rebuild from scratch.
    if (!source || !this.holder.map.getLayer(layerId)) {
      removeLayerIfExists(this.holder.map, layerId);
      removeSourceIfExists(this.holder.map, sourceId);
      return this.createGroundImage(state);
    }

    const coordinates = groundImageCoordinates(state);
    if (!coordinates) return null;

    const prev = this.applied.get(state.id);
    const coordsKey = JSON.stringify(coordinates);
    if (!prev || prev.url !== state.imageUrl) {
      source.updateImage({ url: state.imageUrl, coordinates: coordinates as ImageCoordinates });
    } else if (prev.coordsKey !== coordsKey) {
      // Bounds-only change: reposition without reloading the image.
      source.setCoordinates(coordinates as ImageCoordinates);
    }
    if (!prev || prev.opacity !== state.opacity) {
      this.holder.map.setPaintProperty(layerId, 'raster-opacity', state.opacity);
    }

    this.applied.set(state.id, { url: state.imageUrl, coordsKey, opacity: state.opacity });
    return state.id;
  }

  async removeGroundImage(entity: GroundImageEntity<string>): Promise<void> {
    this.applied.delete(entity.groundImage);
    if (!this.canEditStyle()) return;
    removeLayerIfExists(this.holder.map, this.layerId(entity.groundImage));
    removeSourceIfExists(this.holder.map, this.sourceId(entity.groundImage));
  }
}
