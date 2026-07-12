package com.mapconductor.react.maplibre

import android.content.Context
import android.widget.FrameLayout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.mapconductor.compose.marker.Markers
import com.mapconductor.core.ResourceProvider
import com.mapconductor.core.features.GeoPoint
import com.mapconductor.core.map.MapCameraPosition
import com.mapconductor.core.marker.MarkerState
import com.mapconductor.maplibre.MapLibreMapView
import com.mapconductor.maplibre.MapLibreViewState
import com.mapconductor.react.maplibre.marker.ReactNativeMarkerState
import com.mapconductor.react.maplibre.marker.fromReadableMap
import com.mapconductor.react.maplibre.marker.markerStatesFromReadableArray
import com.mapconductor.react.maplibre.marker.toMarkerIcon
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID
import com.mapconductor.maplibre.MapLibreDesign as ComposeMapLibreDesign

private data class MapLibreWrapperInfoBubblePosition(
    val id: String,
    val point: GeoPoint,
)

class MapLibreMapViewWrapper(context: Context) :
    FrameLayout(context) {

    private val mainCoroutine: CoroutineScope = CoroutineScope(Dispatchers.Main)
    private val composeView = ComposeView(context)
    private val mapViewState = MapLibreViewState(
        id = "maplibre-${UUID.randomUUID()}",
        mapDesignType = ComposeMapLibreDesign.DemoTiles
    )
    private var markerStates by mutableStateOf<Map<String, MarkerState>>(emptyMap())
    private var infoBubblePositions: List<MapLibreWrapperInfoBubblePosition> = emptyList()

    init {
        ResourceProvider.init(context)

        addView(
            composeView,
            LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
        )

        composeView.setContent {
            MapLibreMapView(
                state = mapViewState,
                modifier = Modifier.fillMaxSize(),
                onMapLoaded = {
                    emit("topMapLoaded", Arguments.createMap())
                    emitMarkerScreenPositions()
                    emitInfoBubbleScreenPositions()
                },
                onCameraMoveStart = {
                    emitCameraEvent("topCameraMoveStart", it)
                    emitMarkerScreenPositions()
                    emitInfoBubbleScreenPositions()
                },
                onCameraMove = {
                    emitCameraEvent("topCameraMove", it)
                    emitMarkerScreenPositions()
                    emitInfoBubbleScreenPositions()
                },
                onCameraMoveEnd = {
                    emitCameraEvent("topCameraMoveEnd", it)
                    emitMarkerScreenPositions()
                    emitInfoBubbleScreenPositions()
                },
            ) {
                Markers(markerStates.values.toList())
            }
        }
    }

    fun setCameraPosition(cameraPosition: ReadableMap?) {
        mapViewState.moveCameraTo(MapCameraPosition.fromReadableMap(cameraPosition), null)
    }

    fun setMapDesignType(mapDesignType: String?) {
        val styleUrl = MapLibreDesign.styleUrlFrom(mapDesignType)
        mapViewState.mapDesignType = ComposeMapLibreDesign(id = styleUrl, styleJsonURL = styleUrl)
    }

    fun moveCamera(cameraPosition: ReadableMap?) {
        mapViewState.moveCameraTo(MapCameraPosition.fromReadableMap(cameraPosition), null)
    }

    fun animateCamera(
        cameraPosition: ReadableMap?,
        durationMillis: Int,
    ) {
        mapViewState.moveCameraTo(MapCameraPosition.fromReadableMap(cameraPosition), durationMillis.toLong())
    }

    fun fitBounds(
        bounds: ReadableMap?,
        padding: Int,
    ) {
        mapViewState.fitBounds(geoRectBoundsFromReadableMap(bounds), padding)
    }

    fun setInfoBubblePositions(positions: ReadableArray?) {
        infoBubblePositions =
            (0 until (positions?.size() ?: 0)).mapNotNull { index ->
                val position = positions?.getMap(index) ?: return@mapNotNull null
                val id =
                    if (position.hasKey("id") && !position.isNull("id")) {
                        position.getString("id")
                    } else {
                        null
                    } ?: return@mapNotNull null
                val point = GeoPoint.fromReadableMap(position) ?: return@mapNotNull null
                MapLibreWrapperInfoBubblePosition(id = id, point = point)
            }
        emitInfoBubbleScreenPositions()
    }

    fun clearOverlays() {
        markerStates = emptyMap()
        infoBubblePositions = emptyList()
        emitMarkerScreenPositions()
        emitInfoBubbleScreenPositions()
    }

    fun compositionMarkers(markers: ReadableArray?) {
        markerStates =
            markerStatesFromReadableArray(markers)
                .associate { it.id to it.toCoreMarkerState(markerStates[it.id]) }
        emitMarkerScreenPositions()
        emitInfoBubbleScreenPositions()
    }

    fun updateMarker(marker: ReadableMap?) {
        val state = ReactNativeMarkerState.fromReadableMap(marker) ?: return
        val previous = markerStates[state.id]
        val next = state.toCoreMarkerState(previous)
        markerStates = markerStates + (state.id to next)
        state.animation?.let(next::animate)
        emitMarkerScreenPositions()
        emitInfoBubbleScreenPositions()
    }

    fun onDropViewInstance() {}

    override fun onLayout(
        changed: Boolean,
        left: Int,
        top: Int,
        right: Int,
        bottom: Int,
    ) {
        super.onLayout(changed, left, top, right, bottom)
        composeView.layout(0, 0, right - left, bottom - top)
        emitMarkerScreenPositions()
        emitInfoBubbleScreenPositions()
    }

    private fun emitCameraEvent(
        eventName: String,
        camera: MapCameraPosition,
    ) {
        emit(eventName, Arguments.createMap().apply { putMap("cameraPosition", camera.toWritableMap()) })
    }

    private fun emit(
        eventName: String,
        event: WritableMap,
    ) {
        val reactContext = context as? ReactContext ?: return
        val surfaceId = UIManagerHelper.getSurfaceId(this)
        UIManagerHelper.getEventDispatcher(reactContext)
            ?.dispatchEvent(MapLibreMapViewWrapperEvent(surfaceId, id, eventName, event))
    }

    private fun emitMarkerScreenPositions() {
        mainCoroutine.launch {
            val density = ResourceProvider.getDensity()
            val holder = mapViewState.getMapViewHolder() ?: return@launch
            val array =
                Arguments.createArray().apply {
                    markerStates.values.forEach { marker ->
                        val offset = holder.toScreenOffset(marker.position) ?: return@forEach
                        pushMap(
                            Arguments.createMap().apply {
                                putString("markerId", marker.id)
                                putDouble("x", offset.x.toDouble() / density)
                                putDouble("y", offset.y.toDouble() / density)
                            },
                        )
                    }
                }
            emit("topMarkerScreenPositions", Arguments.createMap().apply { putArray("positions", array) })
        }
    }

    private fun emitInfoBubbleScreenPositions() {
        mainCoroutine.launch {
            val density = ResourceProvider.getDensity()
            val holder = mapViewState.getMapViewHolder() ?: return@launch
            val array =
                Arguments.createArray().apply {
                    infoBubblePositions.forEach { position ->
                        val offset = holder.toScreenOffset(position.point) ?: return@forEach
                        pushMap(
                            Arguments.createMap().apply {
                                putString("id", position.id)
                                putDouble("x", offset.x.toDouble() / density)
                                putDouble("y", offset.y.toDouble() / density)
                            },
                        )
                    }
                }
            emit("topInfoBubbleScreenPositions", Arguments.createMap().apply { putArray("positions", array) })
        }
    }

    private fun ReactNativeMarkerState.toCoreMarkerState(previous: MarkerState?): MarkerState {
        val next =
            previous ?: MarkerState(
                id = id,
                position = position,
                clickable = clickable,
                draggable = draggable,
                zIndex = zIndex?.toInt(),
                icon = icon?.toMarkerIcon(context),
                onClick = {
                    emit("topMarkerClick", Arguments.createMap().apply { putString("markerId", id) })
                },
            )

        next.position = position
        next.clickable = clickable
        next.draggable = draggable
        next.zIndex = zIndex?.toInt()
        next.icon = icon?.toMarkerIcon(context)
        next.onClick =
            if (clickable) {
                {
                    emit("topMarkerClick", Arguments.createMap().apply { putString("markerId", id) })
                }
            } else {
                null
            }
        return next
    }
}

private class MapLibreMapViewWrapperEvent(
    surfaceId: Int,
    viewTag: Int,
    private val name: String,
    private val payload: WritableMap,
) : Event<MapLibreMapViewWrapperEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = name

    override fun canCoalesce(): Boolean = false

    override fun getEventData(): WritableMap = payload
}
