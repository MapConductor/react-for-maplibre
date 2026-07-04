import type { MapLayerMouseEvent } from 'maplibre-gl';
import {
  CircleController,
  type CircleState,
} from '@mapconductor/js-sdk-core';
import { lngLatFromEvent } from '../helpers';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';
import {
  type MapLibreActualCircle,
} from './MapLibreCircleLayer';
import { MapLibreCircleOverlayRenderer } from './MapLibreCircleOverlayRenderer';

export class MapLibreCircleController extends CircleController<MapLibreActualCircle> {
  declare readonly renderer: MapLibreCircleOverlayRenderer;

  constructor(
    private readonly holder: MapLibreMapViewHolder,
    renderer: MapLibreCircleOverlayRenderer,
  ) {
    super({ circleManager: renderer.circleManager, renderer });
  }

  async composition(data: CircleState[]): Promise<void> {
    await this.add(data);
  }

  override async add(data: CircleState[]): Promise<void> {
    await super.add(data);
    this.ensureClickHandler();
  }

  override async update(state: CircleState): Promise<void> {
    await super.update(state);
    await this.renderer.redraw();
  }

  has(state: CircleState): boolean {
    return this.circleManager.hasEntity(state.id);
  }

  async resync(): Promise<void> {
    this.detachClickHandler();
    await this.renderer.redraw();
    this.ensureClickHandler();
  }

  override async clear(): Promise<void> {
    await super.clear();
    await this.renderer.redraw();
  }

  override destroy(): void {
    this.detachClickHandler();
    super.destroy();
  }

  private clickHandlerAttached = false;

  private ensureClickHandler(): void {
    if (this.clickHandlerAttached || !this.holder.map.getLayer(this.renderer.layer.layerId)) {
      return;
    }
    this.holder.map.on('click', this.renderer.layer.layerId, this.handleClick);
    this.clickHandlerAttached = true;
  }

  private detachClickHandler(): void {
    if (!this.clickHandlerAttached) return;
    this.holder.map.off('click', this.renderer.layer.layerId, this.handleClick);
    this.clickHandlerAttached = false;
  }

  private readonly handleClick = (event: MapLayerMouseEvent): void => {
    const clicked = lngLatFromEvent(event);
    const entity = this.find(clicked);
    if (!entity) return;
    this.dispatchClick({ state: entity.state, clicked });
  };
}
