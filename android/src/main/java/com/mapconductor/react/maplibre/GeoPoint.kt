package com.mapconductor.react.maplibre

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.mapconductor.core.features.GeoPoint
import org.maplibre.android.geometry.LatLng

fun GeoPoint.toLatLng(): LatLng = LatLng(latitude, longitude, altitude)

fun LatLng.toGeoPoint(): GeoPoint = GeoPoint(latitude, longitude, altitude)

fun GeoPoint.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
        putDouble("latitude", latitude)
        putDouble("longitude", longitude)
        putDouble("altitude", altitude)
    }

fun GeoPoint.Companion.fromReadableMap(map: ReadableMap?): GeoPoint? {
    if (map == null) return null
    val latitude = map.getDoubleOrNull("latitude") ?: return null
    val longitude = map.getDoubleOrNull("longitude") ?: return null
    return GeoPoint(latitude, longitude, map.getDoubleOrNull("altitude") ?: 0.0)
}
