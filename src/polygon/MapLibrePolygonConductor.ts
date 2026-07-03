import type { MapLayerMouseEvent } from 'maplibre-gl';
import {
  createPolygonEntity,
  type OnPolygonEventHandler,
  type PolygonState,
} from '@mapconductor/core';
import { lngLatFromEvent } from '../helpers';
import { MapLibreMapViewHolder } from '../MapLibreMapViewHolder';
import { MapLibrePolygonOverlayRenderer } from './MapLibrePolygonOverlayRenderer';

export class MapLibrePolygonConductor {
  readonly polygonOverlay: MapLibrePolygonOverlayRenderer;
  clickListener: OnPolygonEventHandler | null = null;

  private clickHandlerAttached = false;
  private operation = Promise.resolve();

  constructor(
    private readonly holder: MapLibreMapViewHolder,
    polygonOverlay: MapLibrePolygonOverlayRenderer,
  ) {
    this.polygonOverlay = polygonOverlay;
  }

  composition(data: PolygonState[]): Promise<void> {
    return this.enqueue(async () => {
      const nextIds = new Set(data.map((state) => state.id));
      for (const entity of this.polygonOverlay.polygonManager.allEntities()) {
        if (!nextIds.has(entity.state.id)) {
          this.polygonOverlay.polygonManager.removeEntity(entity.state.id);
        }
      }

      for (const state of data) {
        const polygon = await this.polygonOverlay.createPolygon(state);
        if (polygon) {
          this.polygonOverlay.polygonManager.registerEntity(createPolygonEntity({ polygon, state }));
        }
      }

      await this.redraw();
    });
  }

  update(state: PolygonState): Promise<void> {
    return this.enqueue(async () => {
      const polygon = await this.polygonOverlay.createPolygon(state);
      if (polygon) {
        this.polygonOverlay.polygonManager.registerEntity(createPolygonEntity({ polygon, state }));
      }
      await this.redraw();
    });
  }

  has(state: PolygonState): boolean {
    return this.polygonOverlay.polygonManager.hasEntity(state.id);
  }

  resync(): Promise<void> {
    return this.enqueue(() => this.redraw());
  }

  clear(): Promise<void> {
    return this.enqueue(async () => {
      this.polygonOverlay.polygonManager.clear();
      await this.redraw();
    });
  }

  private async redraw(): Promise<void> {
    await this.polygonOverlay.onPostProcess();
    this.ensureClickHandler();
  }

  private ensureClickHandler(): void {
    if (
      this.clickHandlerAttached ||
      !this.holder.map.getLayer(this.polygonOverlay.layer.layerId)
    ) {
      return;
    }

    this.holder.map.on(
      'click',
      this.polygonOverlay.layer.layerId,
      this.handleClick,
    );
    this.clickHandlerAttached = true;
  }

  private readonly handleClick = (event: MapLayerMouseEvent): void => {
    const clicked = lngLatFromEvent(event);
    const entity = this.polygonOverlay.polygonManager.find(clicked);
    if (!entity) return;

    const polygonEvent = { state: entity.state, clicked };
    entity.state.onClick?.(polygonEvent);
    this.clickListener?.(polygonEvent);
  };

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.operation.then(operation);
    this.operation = next.catch(() => undefined);
    return next;
  }
}
