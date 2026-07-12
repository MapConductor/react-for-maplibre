package com.mapconductor.react.maplibre

import android.content.Context
import android.os.Bundle
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.mapconductor.core.ResourceProvider
import com.mapconductor.core.features.GeoPoint
import com.mapconductor.core.map.MapCameraPosition
import com.mapconductor.react.maplibre.marker.ReactNativeMarkerState
import com.mapconductor.react.maplibre.marker.fromReadableMap
import com.mapconductor.react.maplibre.marker.markerStatesFromReadableArray
import org.maplibre.android.MapLibre
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.gestures.MoveGestureDetector
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.OnMapReadyCallback

private data class InfoBubblePosition(
    val id: String,
    val point: GeoPoint,
)

class MapConductorMapLibreView(context: Context) :
    FrameLayout(context),
    OnMapReadyCallback,
    MapLibreMap.OnMoveListener,
    MapLibreMap.OnCameraMoveListener,
    MapLibreMap.OnCameraIdleListener,
    MapLibreMap.OnMapClickListener,
    MapLibreMap.OnMapLongClickListener {
    private val mapView: MapView
    private var controller: MapLibreViewController? = null
    private var pendingCameraPosition: MapCameraPosition? = null
    private var pendingStyleValue: String = MapLibreDesign.DEFAULT_STYLE_URL
    private var pendingMarkers: List<ReactNativeMarkerState> = emptyList()
    private var infoBubblePositions: List<InfoBubblePosition> = emptyList()
    private var destroyed = false

    init {
        ResourceProvider.init(context)
        MapLibre.getInstance(context)
        mapView = MapView(context)
        addView(mapView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        mapView.onCreate(Bundle())
        mapView.getMapAsync(this)
    }

    fun setCameraPosition(cameraPosition: ReadableMap?) {
        val position = MapCameraPosition.fromReadableMap(cameraPosition)
        pendingCameraPosition = position
        controller?.moveCamera(position)
    }

    fun setMapDesignType(mapDesignType: String?) {
        pendingStyleValue = mapDesignType ?: MapLibreDesign.DEFAULT_STYLE_URL
        controller?.setMapDesignType(pendingStyleValue)
    }

    fun moveCamera(cameraPosition: ReadableMap?) {
        val position = MapCameraPosition.fromReadableMap(cameraPosition)
        pendingCameraPosition = position
        controller?.moveCamera(position)
    }

    fun animateCamera(
        cameraPosition: ReadableMap?,
        durationMillis: Int,
    ) {
        val position = MapCameraPosition.fromReadableMap(cameraPosition)
        pendingCameraPosition = position
        controller?.animateCamera(position, durationMillis.toLong())
    }

    fun fitBounds(
        bounds: ReadableMap?,
        padding: Int,
    ) {
        controller?.fitBounds(geoRectBoundsFromReadableMap(bounds), padding)
    }

    fun clearOverlays() {
        controller?.clearOverlays()
    }

    fun compositionMarkers(markers: ReadableArray?) {
        val data = markerStatesFromReadableArray(markers)
        pendingMarkers = data
        controller?.compositionMarkers(data)
        emitMarkerScreenPositions()
    }

    fun updateMarker(marker: ReadableMap?) {
        val state = ReactNativeMarkerState.fromReadableMap(marker) ?: return
        pendingMarkers = pendingMarkers.filterNot { it.id == state.id } + state
        controller?.updateMarker(state)
        emitMarkerScreenPositions()
        emitInfoBubbleScreenPositions()
    }

    fun setInfoBubblePositions(positions: ReadableArray?) {
        infoBubblePositions =
            (0 until (positions?.size() ?: 0)).mapNotNull { index ->
                val position = positions?.getMap(index) ?: return@mapNotNull null
                val id = position.getString("id") ?: return@mapNotNull null
                if (!position.hasKey("latitude") || !position.hasKey("longitude")) return@mapNotNull null
                InfoBubblePosition(
                    id = id,
                    point =
                        GeoPoint(
                            position.getDouble("latitude"),
                            position.getDouble("longitude"),
                            if (position.hasKey("altitude") && !position.isNull("altitude")) {
                                position.getDouble("altitude")
                            } else {
                                0.0
                            },
                        ),
                )
            }
        emitInfoBubbleScreenPositions()
    }

    override fun onMapReady(map: MapLibreMap) {
        val holder = MapLibreViewHolder(mapView, map)
        val ctrl = MapLibreViewController(holder)
        controller = ctrl

        pendingCameraPosition?.let(ctrl::moveCamera)

        map.addOnMoveListener(this)
        map.addOnCameraMoveListener(this)
        map.addOnCameraIdleListener(this)
        map.addOnMapClickListener(this)
        map.addOnMapLongClickListener(this)
        map.setStyle(MapLibreDesign.styleUrlFrom(pendingStyleValue)) {
            ctrl.onStyleLoaded(it)
            if (pendingMarkers.isNotEmpty()) ctrl.compositionMarkers(pendingMarkers)
            emit("topMapLoaded", Arguments.createMap())
            emitMarkerScreenPositions()
            emitInfoBubbleScreenPositions()
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        mapView.onStart()
        mapView.onResume()
    }

    override fun onDetachedFromWindow() {
        mapView.onPause()
        mapView.onStop()
        super.onDetachedFromWindow()
    }

    fun onDropViewInstance() {
        if (destroyed) return
        destroyed = true
        mapView.onPause()
        mapView.onStop()
        mapView.onDestroy()
    }

    override fun onLayout(
        changed: Boolean,
        left: Int,
        top: Int,
        right: Int,
        bottom: Int,
    ) {
        super.onLayout(changed, left, top, right, bottom)
        mapView.layout(0, 0, right - left, bottom - top)
        emitMarkerScreenPositions()
        emitInfoBubbleScreenPositions()
    }

    override fun onMoveBegin(detector: MoveGestureDetector) {
        emitCameraEvent("topCameraMoveStart")
    }

    override fun onMove(detector: MoveGestureDetector) = Unit

    override fun onMoveEnd(detector: MoveGestureDetector) = Unit

    override fun onCameraMove() {
        emitCameraEvent("topCameraMove")
        emitMarkerScreenPositions()
        emitInfoBubbleScreenPositions()
    }

    override fun onCameraIdle() {
        emitCameraEvent("topCameraMoveEnd")
        emitMarkerScreenPositions()
        emitInfoBubbleScreenPositions()
    }

    override fun onMapClick(point: LatLng): Boolean {
        val marker = controller?.markerController?.find(point.toGeoPoint())
        if (marker != null && marker.clickable) {
            emit("topMarkerClick", Arguments.createMap().apply { putString("markerId", marker.id) })
            return true
        }
        emitPointEvent("topMapClick", point)
        return true
    }

    override fun onMapLongClick(point: LatLng): Boolean {
        emitPointEvent("topMapLongClick", point)
        return true
    }

    private fun emitCameraEvent(eventName: String) {
        val camera = controller?.getCameraPosition()?.toWritableMap() ?: return
        emit(eventName, Arguments.createMap().apply { putMap("cameraPosition", camera) })
    }

    private fun emitPointEvent(
        eventName: String,
        point: LatLng,
    ) {
        emit(
            eventName,
            Arguments.createMap().apply {
                putMap("point", GeoPoint(point.latitude, point.longitude, point.altitude).toWritableMap())
            },
        )
    }

    private fun emitMarkerScreenPositions() {
        val positions = controller?.markerController?.screenPositions() ?: return
        val density = ResourceProvider.getDensity()
        val array =
            Arguments.createArray().apply {
                positions.forEach { position ->
                    pushMap(
                        Arguments.createMap().apply {
                            putString("markerId", position.markerId)
                            putDouble("x", position.x / density)
                            putDouble("y", position.y / density)
                        },
                    )
                }
            }
        emit("topMarkerScreenPositions", Arguments.createMap().apply { putArray("positions", array) })
    }

    private fun emitInfoBubbleScreenPositions() {
        val map = controller?.holder?.map ?: return
        val density = ResourceProvider.getDensity()
        val array =
            Arguments.createArray().apply {
                infoBubblePositions.forEach { position ->
                    val screenPoint =
                        map.projection.toScreenLocation(
                            LatLng(position.point.latitude, position.point.longitude, position.point.altitude),
                        )
                    pushMap(
                        Arguments.createMap().apply {
                            putString("id", position.id)
                            putDouble("x", screenPoint.x.toDouble() / density)
                            putDouble("y", screenPoint.y.toDouble() / density)
                        },
                    )
                }
            }
        emit("topInfoBubbleScreenPositions", Arguments.createMap().apply { putArray("positions", array) })
    }

    private fun emit(
        eventName: String,
        event: WritableMap,
    ) {
        val reactContext = context as? ReactContext ?: return
        val surfaceId = UIManagerHelper.getSurfaceId(this)
        UIManagerHelper.getEventDispatcher(reactContext)
            ?.dispatchEvent(MapConductorMapLibreEvent(surfaceId, id, eventName, event))
    }
}

private class MapConductorMapLibreEvent(
    surfaceId: Int,
    viewTag: Int,
    private val name: String,
    private val payload: WritableMap,
) : Event<MapConductorMapLibreEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = name

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap = payload
}
