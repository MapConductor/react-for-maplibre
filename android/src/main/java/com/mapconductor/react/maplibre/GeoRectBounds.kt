package com.mapconductor.react.maplibre

import com.facebook.react.bridge.ReadableMap
import com.mapconductor.core.features.GeoPoint
import com.mapconductor.core.features.GeoRectBounds
import org.maplibre.android.geometry.LatLngBounds

fun GeoRectBounds.toLatLngBounds(): LatLngBounds? {
    val sw = southWest ?: return null
    val ne = northEast ?: return null
    return LatLngBounds.from(
        ne.latitude,
        ne.longitude,
        sw.latitude,
        sw.longitude,
    )
}

fun geoRectBoundsFromReadableMap(map: ReadableMap?): GeoRectBounds {
    if (map == null) return GeoRectBounds()
    return GeoRectBounds(
        southWest = GeoPoint.fromReadableMap(map.getMap("southWest")),
        northEast = GeoPoint.fromReadableMap(map.getMap("northEast")),
    )
}
