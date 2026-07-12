package com.mapconductor.react.maplibre.marker

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.mapconductor.core.features.GeoPoint
import com.mapconductor.core.marker.MarkerAnimation
import com.mapconductor.react.maplibre.fromReadableMap
import com.mapconductor.react.maplibre.getDoubleOrNull

data class ReactNativeMarkerState(
    val id: String,
    val position: GeoPoint,
    val clickable: Boolean = true,
    val draggable: Boolean = false,
    val zIndex: Float? = null,
    val icon: ReactNativeMarkerIcon? = null,
    val animation: MarkerAnimation? = null,
) {
    companion object
}

fun ReactNativeMarkerState.Companion.fromReadableMap(map: ReadableMap?): ReactNativeMarkerState? {
    if (map == null) return null
    val id = if (map.hasKey("id") && !map.isNull("id")) map.getString("id") else null
    val position = GeoPoint.fromReadableMap(map.getMap("position"))
    if (id == null || position == null) return null
    return ReactNativeMarkerState(
        id = id,
        position = position,
        clickable = if (map.hasKey("clickable") && !map.isNull("clickable")) map.getBoolean("clickable") else true,
        draggable = if (map.hasKey("draggable") && !map.isNull("draggable")) map.getBoolean("draggable") else false,
        zIndex = map.getDoubleOrNull("zIndex")?.toFloat(),
        icon = ReactNativeMarkerIcon.fromReadableMap(if (map.hasKey("icon") && !map.isNull("icon")) map.getMap("icon") else null),
        animation = if (map.hasKey("animation") && !map.isNull("animation")) {
            runCatching { MarkerAnimation.valueOf(map.getString("animation") ?: "") }.getOrNull()
        } else {
            null
        },
    )
}

fun markerStatesFromReadableArray(array: ReadableArray?): List<ReactNativeMarkerState> {
    if (array == null) return emptyList()
    return buildList {
        for (index in 0 until array.size()) {
            ReactNativeMarkerState.fromReadableMap(array.getMap(index))?.let(::add)
        }
    }
}
