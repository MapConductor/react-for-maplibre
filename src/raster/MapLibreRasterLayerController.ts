import {
  createRasterLayerEntity,
  RasterLayerController,
  RasterLayerManager,
  type RasterHeaderSupport,
} from '@mapconductor/js-sdk-core';
import {
  type MapLibreRasterLayerHandle,
  MapLibreRasterLayerOverlayRenderer,
} from './MapLibreRasterLayerOverlayRenderer';

/**
 * android-sdk の MapLibreRasterLayerController と同じく汎用 RasterLayerController の薄い
 * サブクラス。composition/update/has/clear は基底クラスが提供する。GL スタイルが
 * 再読み込みされると既存のソース・レイヤーは失われるため、resync() で登録済みの
 * ラスターレイヤーを貼り直す（android-sdk の reapplyStyle 相当）。
 */
export class MapLibreRasterLayerController extends RasterLayerController<MapLibreRasterLayerHandle> {
  /**
   * maplibre-gl の transformRequest（MapLibreProvider が地図生成時に差している）でタイル要求にヘッダを載せる。
   *
   * userAgent はブラウザが上書きを許さないので、どのプロバイダでも web では効かない。
   */
  protected override get headerSupport(): RasterHeaderSupport {
    return { provider: 'MapLibre', extraHeaders: true };
  }

  constructor(renderer: MapLibreRasterLayerOverlayRenderer) {
    super({ rasterLayerManager: new RasterLayerManager<MapLibreRasterLayerHandle>(), renderer });
  }

  async resync(): Promise<void> {
    const states = this.rasterLayerManager.allEntities().map((entity) => entity.state);
    if (states.length === 0) return;
    const layers = await this.renderer.onAdd(states.map((state) => ({ state })));
    layers.forEach((layer, index) => {
      if (layer != null) {
        this.rasterLayerManager.registerEntity(
          createRasterLayerEntity({ layer, state: states[index] }),
        );
      }
    });
    await this.renderer.onPostProcess();
  }
}
