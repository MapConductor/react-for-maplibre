import { createGeoPoint, createMapCameraPosition, type MapCameraPosition } from '@mapconductor/core';
import type maplibregl from 'maplibre-gl';
import { ZoomAltitudeConverter } from './zoom/ZoomAltitudeConverter';

/**
 * Converts a MapConductor MapCameraPosition to MapLibre camera parameters.
 * Applies the zoom offset: MapLibre zoom = MapConductor zoom - 1.
 */
export function toCameraPosition(pos: MapCameraPosition): {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
} {
    return {
        center: [pos.center.longitude, pos.center.latitude],
        zoom: ZoomAltitudeConverter.googleZoomToMaplibreZoom(pos.zoom),
        bearing: pos.bearing,
        pitch: pos.pitch,
    };
}

/**
 * Converts MapLibre camera state to a MapConductor MapCameraPosition.
 * Applies the zoom offset: MapConductor zoom = MapLibre zoom + 1.
 */
export function toMapCameraPosition({
    center,
    zoom,
    bearing,
    pitch,
}: {
    center: maplibregl.LngLat;
    zoom: number;
    bearing: number;
    pitch: number;
}): MapCameraPosition {
    return createMapCameraPosition({
        position: createGeoPoint({ latitude: center.lat, longitude: center.lng }),
        zoom: ZoomAltitudeConverter.maplibreZoomToGoogleZoom(zoom),
        bearing,
        tilt: pitch,
    });
}
