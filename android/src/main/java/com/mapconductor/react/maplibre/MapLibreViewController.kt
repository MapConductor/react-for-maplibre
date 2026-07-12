package com.mapconductor.react.maplibre

import com.mapconductor.core.features.GeoRectBounds
import com.mapconductor.core.map.MapCameraPosition
import com.mapconductor.react.maplibre.marker.MapLibreMarkerController
import com.mapconductor.react.maplibre.marker.ReactNativeMarkerState
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.maps.Style

class MapLibreViewController(
    val holder: MapLibreViewHolder,
) {
    val markerController = MapLibreMarkerController(holder)

    fun moveCamera(position: MapCameraPosition) {
        holder.map.moveCamera(CameraUpdateFactory.newCameraPosition(position.toCameraPosition()))
    }

    fun animateCamera(
        position: MapCameraPosition,
        duration: Long,
    ) {
        holder.map.animateCamera(
            CameraUpdateFactory.newCameraPosition(position.toCameraPosition()),
            duration.toInt(),
        )
    }

    fun fitBounds(
        bounds: GeoRectBounds,
        padding: Int,
    ) {
        val latLngBounds = bounds.toLatLngBounds() ?: return
        holder.map.moveCamera(CameraUpdateFactory.newLatLngBounds(latLngBounds, padding))
    }

    fun setMapDesignType(value: String) {
        holder.map.setStyle(MapLibreDesign.styleUrlFrom(value)) { style ->
            markerController.onStyleLoaded(style)
        }
    }

    fun getCameraPosition(): MapCameraPosition = holder.map.cameraPosition.toMapCameraPosition()

    fun clearOverlays() {
        markerController.clear()
    }

    fun onStyleLoaded(style: Style) {
        markerController.onStyleLoaded(style)
    }

    fun compositionMarkers(data: List<ReactNativeMarkerState>) {
        markerController.composition(data)
    }

    fun updateMarker(state: ReactNativeMarkerState) {
        markerController.update(state)
    }
}
