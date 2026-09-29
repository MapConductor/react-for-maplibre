/**
 * 統一ズーム（Google Maps 基準）と MapLibre ズームの往復。
 *
 * MIN/MAX_ZOOM_LEVEL は統一ズームの値なので、オフセットを引いた *あと* に当てては
 * いけない。当てていたころ、統一ズーム 0 は MapLibre 0（= 統一 1）へ潰れ、
 * `zoom: 0` を宣言しても地図は 1 にしかならなかった。見た目には「1 段ぶん
 * 寄っている」だけなので、気づくのは 0 を指定した人だけになる。
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ZoomAltitudeConverter } from '../dist/index.mjs';

const toMaplibre = (z) => ZoomAltitudeConverter.googleZoomToMaplibreZoom(z);
const toGoogle = (z) => ZoomAltitudeConverter.maplibreZoomToGoogleZoom(z);

test('統一ズーム 0 は MapLibre の -1 で、潰れない', () => {
    assert.equal(toMaplibre(0), -1);
    assert.equal(toGoogle(-1), 0);
});

test('有効域のどこでも往復して元のズームに戻る', () => {
    for (let z = 0; z <= 22; z += 0.5) {
        assert.ok(
            Math.abs(toGoogle(toMaplibre(z)) - z) < 1e-12,
            `統一ズーム ${z} が往復で戻らない`,
        );
    }
});

test('有効域の外は統一ズームの端に丸める', () => {
    assert.equal(toGoogle(toMaplibre(-3)), 0);
    assert.equal(toGoogle(toMaplibre(25)), 22);
});

test('オフセットは 1 段ぶん', () => {
    for (const z of [1, 11, 22]) assert.equal(toMaplibre(z), z - 1);
});
