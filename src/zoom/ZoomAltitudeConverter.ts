import { AbstractZoomAltitudeConverter } from '@mapconductor/js-sdk-core';

export class ZoomAltitudeConverter extends AbstractZoomAltitudeConverter {
    /** Empirical offset: GoogleZoom ≈ MapLibreSDK.zoom + 1.0 */
    static readonly MAPLIBRE_TO_GOOGLE_ZOOM_OFFSET = 1.0;

    static maplibreZoomToGoogleZoom(maplibreZoom: number): number {
        const google = maplibreZoom + ZoomAltitudeConverter.MAPLIBRE_TO_GOOGLE_ZOOM_OFFSET;
        return Math.min(Math.max(google, AbstractZoomAltitudeConverter.MIN_ZOOM_LEVEL), AbstractZoomAltitudeConverter.MAX_ZOOM_LEVEL);
    }

    static googleZoomToMaplibreZoom(googleZoom: number): number {
        const maplibre = googleZoom - ZoomAltitudeConverter.MAPLIBRE_TO_GOOGLE_ZOOM_OFFSET;
        return Math.min(Math.max(maplibre, AbstractZoomAltitudeConverter.MIN_ZOOM_LEVEL), AbstractZoomAltitudeConverter.MAX_ZOOM_LEVEL);
    }

    private cosLatitudeFactor(latitude: number): number {
        const clamped = Math.max(-85, Math.min(85, latitude));
        const latRad = (clamped * Math.PI) / 180;
        return Math.max(AbstractZoomAltitudeConverter.MIN_COS_LAT, Math.abs(Math.cos(latRad)));
    }

    private cosTiltFactor(tilt: number): number {
        const clamped = Math.max(0, Math.min(90, tilt));
        const tiltRad = (clamped * Math.PI) / 180;
        return Math.max(AbstractZoomAltitudeConverter.MIN_COS_TILT, Math.cos(tiltRad));
    }

    zoomLevelToAltitude({
        zoomLevel,
        latitude,
        tilt,
    }: {
        zoomLevel: number;
        latitude: number;
        tilt: number;
    }): number {
        const googleZoom = ZoomAltitudeConverter.maplibreZoomToGoogleZoom(zoomLevel);
        const cosLat = this.cosLatitudeFactor(latitude);
        const cosTilt = this.cosTiltFactor(tilt);
        const distance = (this.zoom0Altitude * cosLat) / Math.pow(AbstractZoomAltitudeConverter.ZOOM_FACTOR, googleZoom);
        const altitude = distance * cosTilt;
        return Math.min(Math.max(altitude, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
    }

    altitudeToZoomLevel({
        altitude,
        latitude,
        tilt,
    }: {
        altitude: number;
        latitude: number;
        tilt: number;
    }): number {
        const clampedAltitude = Math.min(Math.max(altitude, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
        const cosLat = this.cosLatitudeFactor(latitude);
        const cosTilt = this.cosTiltFactor(tilt);
        const distance = clampedAltitude / cosTilt;
        const googleZoom = Math.log2((this.zoom0Altitude * cosLat) / distance);
        return ZoomAltitudeConverter.googleZoomToMaplibreZoom(googleZoom);
    }
}
