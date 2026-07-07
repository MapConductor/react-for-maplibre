import type {
  MarkerEntity,
  OnMarkerEventHandler,
  Offset,
} from '@mapconductor/js-sdk-core';
import { MapLibreMarkerController } from './MapLibreMarkerController';
import {
  type MapLibreActualMarker,
} from './MarkerLayer';

export class MapLibreMarkerEventController {
  private activePointerId: number | null = null;
  private dragPanWasEnabled = false;

  /** Last observed pointer input type — used by MapLibreViewController for tile-marker hit radius. */
  lastPointerType: 'touch' | 'mouse' = 'mouse';

  constructor(private readonly controller: MapLibreMarkerController) {
    const canvas = this.controller.renderer.holder.map.getCanvas();
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
  }

  resync(): void {
    // Marker clicks are handled at the view level (MapLibreViewController map.on('click')).
  }

  setClickListener(listener: OnMarkerEventHandler | null): void {
    this.controller.clickListener = listener;
  }

  setDragStartListener(listener: OnMarkerEventHandler | null): void {
    this.controller.dragStartListener = listener;
  }

  setDragListener(listener: OnMarkerEventHandler | null): void {
    this.controller.dragListener = listener;
  }

  setDragEndListener(listener: OnMarkerEventHandler | null): void {
    this.controller.dragEndListener = listener;
  }

  setAnimateStartListener(listener: OnMarkerEventHandler | null): void {
    this.controller.animateStartListener = listener;
  }

  setAnimateEndListener(listener: OnMarkerEventHandler | null): void {
    this.controller.animateEndListener = listener;
  }

  destroy(): void {
    const canvas = this.controller.renderer.holder.map.getCanvas();
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointercancel', this.handlePointerCancel);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.lastPointerType = event.pointerType === 'touch' ? 'touch' : 'mouse';
    if (!event.isPrimary || event.button !== 0 || this.activePointerId != null) return;
    const entity = this.findMarkerAtPointer(event);
    if (!entity?.state.draggable) return;

    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.dragPanWasEnabled = this.controller.renderer.holder.map.dragPan.isEnabled();
    this.controller.renderer.holder.map.dragPan.disable();
    this.controller.renderer.holder.map.getCanvas().setPointerCapture(event.pointerId);
    void this.controller.setSelectedMarker(entity);
    this.controller.dispatchDragStart(entity.state);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    const selected = this.controller.getSelectedMarker();
    if (!selected) return;

    event.preventDefault();
    const position = this.positionFromPointer(event);
    selected.state.setPosition(position);
    this.controller.updateSelectedPosition(position);
    this.controller.dispatchDrag(selected.state);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    void this.finishDrag(event, true);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    void this.finishDrag(event, false);
  };

  private async finishDrag(event: PointerEvent, updatePosition: boolean): Promise<void> {
    const selected = this.controller.getSelectedMarker();
    if (!selected) {
      this.restoreMapInteraction(event.pointerId);
      return;
    }

    if (updatePosition) {
      const position = this.positionFromPointer(event);
      selected.state.setPosition(position);
      this.controller.updateSelectedPosition(position);
    }
    await this.controller.setSelectedMarker(null);
    this.controller.dispatchDragEnd(selected.state);
    this.restoreMapInteraction(event.pointerId);
  }

  private restoreMapInteraction(pointerId: number): void {
    const canvas = this.controller.renderer.holder.map.getCanvas();
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    if (this.dragPanWasEnabled) this.controller.renderer.holder.map.dragPan.enable();
    this.dragPanWasEnabled = false;
    this.activePointerId = null;
  }

  private findMarkerAtPointer(
    event: PointerEvent,
  ): MarkerEntity<MapLibreActualMarker> | null {
    const map = this.controller.renderer.holder.map;
    if (!map.getLayer(this.controller.renderer.markerLayer.layerId)) return null;
    const point = this.localPoint(event);
    const features = map.queryRenderedFeatures([point.x, point.y], {
      layers: [this.controller.renderer.markerLayer.layerId],
    });
    const id = features[0]?.properties?.['mc-id'];
    return typeof id === 'string' ? this.controller.markerManager.getEntity(id) : null;
  }

  private positionFromPointer(event: PointerEvent) {
    return this.controller.renderer.holder.fromScreenOffsetSync(this.localPoint(event));
  }

  private localPoint(event: PointerEvent): Offset {
    const rect = this.controller.renderer.holder.map.getCanvas().getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
}
