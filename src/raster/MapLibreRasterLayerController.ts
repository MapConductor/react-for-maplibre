import { type RasterLayerState } from '@mapconductor/js-sdk-core';
import { MapLibreRasterLayerOverlayRenderer } from './MapLibreRasterLayerOverlayRenderer';

export class MapLibreRasterLayerController {
  private readonly rasterLayerStates = new Map<string, RasterLayerState>();
  private readonly renderer: MapLibreRasterLayerOverlayRenderer;

  constructor(renderer: MapLibreRasterLayerOverlayRenderer) {
    this.renderer = renderer;
  }

  composition(data: RasterLayerState[]): void {
    const nextIds = new Set(data.map((s) => s.id));
    for (const id of [...this.rasterLayerStates.keys()]) {
      if (!nextIds.has(id)) this.remove(id);
    }
    this.rasterLayerStates.clear();
    for (const state of data) {
      this.rasterLayerStates.set(state.id, state);
      this.renderer.upsert(state, true);
    }
  }

  update(state: RasterLayerState): void {
    this.rasterLayerStates.set(state.id, state);
    this.renderer.upsert(state, true);
  }

  has(state: RasterLayerState): boolean {
    return this.rasterLayerStates.has(state.id);
  }

  resync(): void {
    for (const state of this.rasterLayerStates.values()) this.renderer.upsert(state, false);
  }

  clear(): void {
    for (const id of [...this.rasterLayerStates.keys()]) this.remove(id);
  }

  private remove(id: string): void {
    this.renderer.remove(id);
    this.rasterLayerStates.delete(id);
  }
}
