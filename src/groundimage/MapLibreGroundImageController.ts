import { createGroundImageEntity, type GeoPoint, type GroundImageState } from '@mapconductor/core';
import { MapLibreGroundImageOverlayRenderer } from './MapLibreGroundImageOverlayRenderer';

export class MapLibreGroundImageController {
  private readonly groundImageStates = new Map<string, GroundImageState>();
  private readonly groundImageIds = new Set<string>();
  private readonly renderer: MapLibreGroundImageOverlayRenderer;

  constructor(renderer: MapLibreGroundImageOverlayRenderer) {
    this.renderer = renderer;
  }

  composition(data: GroundImageState[]): void {
    const nextIds = new Set(data.map((s) => s.id));
    for (const id of [...this.groundImageIds]) {
      if (!nextIds.has(id)) void this.removeById(id);
    }
    for (const state of data) {
      this.groundImageStates.set(state.id, state);
      void this.upsert(state);
    }
  }

  update(state: GroundImageState): void {
    this.groundImageStates.set(state.id, state);
    void this.upsert(state);
  }

  has(state: GroundImageState): boolean {
    return this.groundImageStates.has(state.id);
  }

  hasClickableAt(point: GeoPoint): boolean {
    return Array.from(this.groundImageStates.values()).some(
      (state) => state.onClick != null && state.bounds.contains(point),
    );
  }

  dispatchClick(point: GeoPoint): boolean {
    const states = Array.from(this.groundImageStates.values()).reverse();
    for (const state of states) {
      if (!state.bounds.contains(point)) continue;
      if (!state.onClick) return false;
      state.onClick({ state, clicked: point });
      return true;
    }
    return false;
  }

  resync(): void {
    this.groundImageIds.clear();
    for (const state of this.groundImageStates.values()) void this.upsert(state);
  }

  clear(): void {
    for (const id of [...this.groundImageIds]) void this.removeById(id);
  }

  private async upsert(state: GroundImageState): Promise<void> {
    if (this.groundImageIds.has(state.id)) {
      const entity = createGroundImageEntity({ groundImage: state.id, state });
      await this.renderer.updateGroundImageProperties({
        groundImage: state.id,
        current: entity,
        prev: entity,
      });
    } else {
      const id = await this.renderer.createGroundImage(state);
      if (!id) return;
      this.groundImageIds.add(id);
    }
  }

  private async removeById(id: string): Promise<void> {
    const state = this.groundImageStates.get(id);
    if (!state) return;
    await this.renderer.removeGroundImage(createGroundImageEntity({ groundImage: id, state }));
    this.groundImageIds.delete(id);
    this.groundImageStates.delete(id);
  }
}
