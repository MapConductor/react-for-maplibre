package com.mapconductor.react.maplibre

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class MapConductorMapLibreViewManager : SimpleViewManager<MapLibreMapViewWrapper>() {
    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): MapLibreMapViewWrapper =
        MapLibreMapViewWrapper(reactContext)

    @ReactProp(name = "cameraPosition")
    fun setCameraPosition(
        view: MapLibreMapViewWrapper,
        cameraPosition: ReadableMap?,
    ) {
        view.setCameraPosition(cameraPosition)
    }

    @ReactProp(name = "mapDesignType")
    fun setMapDesignType(
        view: MapLibreMapViewWrapper,
        mapDesignType: String?,
    ) {
        view.setMapDesignType(mapDesignType)
    }

    @ReactProp(name = "infoBubblePositions")
    fun setInfoBubblePositions(
        view: MapLibreMapViewWrapper,
        positions: ReadableArray?,
    ) {
        view.setInfoBubblePositions(positions)
    }

    @ReactProp(name = "markerTilingOptions")
    fun setMarkerTilingOptions(
        view: MapLibreMapViewWrapper,
        options: ReadableMap?,
    ) {
        view.setMarkerTilingOptions(options)
    }

    override fun receiveCommand(
        root: MapLibreMapViewWrapper,
        commandId: String,
        args: ReadableArray?,
    ) {
        when (commandId) {
            "moveCamera" -> root.moveCamera(args?.getMap(0))
            "animateCamera" -> root.animateCamera(args?.getMap(0), args?.getInt(1) ?: 0)
            "fitBounds" -> root.fitBounds(args?.getMap(0), args?.getInt(1) ?: 0)
            "clearOverlays" -> root.clearOverlays()
            "compositionMarkers" -> root.compositionMarkers(args?.getMap(0))
            "updateMarker" -> root.updateMarker(args?.getMap(0))
            "compositionRasterLayers" -> root.compositionRasterLayers(args?.getArray(0))
            "updateRasterLayer" -> root.updateRasterLayer(args?.getMap(0))
            "upsertNativeMapExtension" ->
                root.upsertNativeMapExtension(
                    extensionId = args?.getString(0) ?: return,
                    type = args.getString(1) ?: return,
                    payload = args.getMap(2),
                )
            "removeNativeMapExtension" ->
                root.removeNativeMapExtension(args?.getString(0) ?: return)
        }
    }

    override fun onDropViewInstance(view: MapLibreMapViewWrapper) {
        view.onDropViewInstance()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf(
            "topMapLoaded" to mapOf("registrationName" to "onMapLoaded"),
            "topMapClick" to mapOf("registrationName" to "onMapClick"),
            "topMapLongClick" to mapOf("registrationName" to "onMapLongClick"),
            "topCameraMoveStart" to mapOf("registrationName" to "onCameraMoveStart"),
            "topCameraMove" to mapOf("registrationName" to "onCameraMove"),
            "topCameraMoveEnd" to mapOf("registrationName" to "onCameraMoveEnd"),
            "topMarkerClick" to mapOf("registrationName" to "onMarkerClick"),
            "topMarkerDragStart" to mapOf("registrationName" to "onMarkerDragStart"),
            "topMarkerDrag" to mapOf("registrationName" to "onMarkerDrag"),
            "topMarkerDragEnd" to mapOf("registrationName" to "onMarkerDragEnd"),
            "topMarkerScreenPositions" to mapOf("registrationName" to "onMarkerScreenPositions"),
            "topInfoBubbleScreenPositions" to mapOf("registrationName" to "onInfoBubbleScreenPositions"),
            "topNativeMapExtensionEvent" to mapOf("registrationName" to "onNativeMapExtensionEvent"),
        )

    companion object {
        const val REACT_CLASS = "MapLibreMapView"
    }
}
