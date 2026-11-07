import type { LayerSpecification, RasterTileSource } from 'maplibre-gl';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';

/**
 * The raster layer that shows polygons drawn as tiles (see `PolygonTileSet`).
 *
 * Kept by the polygon controller itself rather than the RasterLayer
 * controller: a `composition()` of the app's own raster layers would remove
 * it. It sits just below the polygon layers the SDK draws, so polygons that are
 * not tiled (geodesic ones) stay on top, and below polylines and markers.
 */
export class MapLibrePolygonTileLayer {
  static readonly SOURCE_ID = 'mc-polygon-tile-source';
  static readonly LAYER_ID = 'mc-polygon-tile-layer';

  private template: string | null = null;
  private tileSize = 256;

  constructor(
    private readonly holder: MapLibreMapViewHolder,
    private readonly canEditStyle: () => boolean,
    private readonly belowLayerIds: readonly string[],
  ) {}

  /** Shows tiles from `template`, or removes the layer when null. */
  show(template: string | null, tileSize = 256): void {
    this.template = template;
    this.tileSize = tileSize;
    this.apply();
  }

  /** Re-adds the layer after a style change dropped it. */
  resync(): void {
    this.apply();
  }

  private apply(): void {
    const map = this.holder.map;
    const { SOURCE_ID, LAYER_ID } = MapLibrePolygonTileLayer;
    if (!this.canEditStyle()) return;
    try {
      if (this.template == null) {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        return;
      }
      const source = map.getSource(SOURCE_ID) as RasterTileSource | undefined;
      if (source) {
        // A new version in the URL makes MapLibre ask for the tiles again.
        source.setTiles([this.template]);
      } else {
        map.addSource(SOURCE_ID, { type: 'raster', tiles: [this.template], tileSize: this.tileSize });
      }
      if (!map.getLayer(LAYER_ID)) {
        const beforeId = this.belowLayerIds.find((id) => map.getLayer(id));
        map.addLayer(
          {
            id: LAYER_ID,
            type: 'raster',
            source: SOURCE_ID,
            // No cross-fade: a restyled polygon should not ghost.
            paint: { 'raster-fade-duration': 0 },
          } as LayerSpecification,
          beforeId,
        );
      }
    } catch {
      // The style is mid-change; resync() puts it back.
    }
  }
}
