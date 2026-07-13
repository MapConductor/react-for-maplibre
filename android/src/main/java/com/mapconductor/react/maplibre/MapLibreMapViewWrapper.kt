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
import com.mapconductor.react.extensions.NativeMapExtensionHostState
import com.mapconductor.core.ResourceProvider
import com.mapconductor.core.features.GeoPoint
import com.mapconductor.core.map.MapCameraPosition
import com.mapconductor.core.marker.MarkerState
import com.mapconductor.core.marker.MarkerTilingOptions
import com.mapconductor.maplibre.MapLibreMapView
import com.mapconductor.maplibre.MapLibreViewState
import com.mapconductor.maplibre.raster.MapLibreRasterLayerController
import com.mapconductor.react.maplibre.marker.ReactNativeMarkerState
import com.mapconductor.react.maplibre.marker.fromReadableMap
import com.mapconductor.react.maplibre.marker.markerStatesFromBatchReadableMap
import com.mapconductor.react.maplibre.marker.toMarkerIcon
import com.mapconductor.react.raster.rasterLayerStateFromReadableMap
import com.mapconductor.react.raster.rasterLayerStatesFromReadableArray
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID
import java.util.concurrent.Executors
import com.mapconductor.maplibre.MapLibreDesign as ComposeMapLibreDesign

private data class MapLibreWrapperInfoBubblePosition(
    val id: String,
    val point: GeoPoint,
)

class MapLibreMapViewWrapper(context: Context) :
    FrameLayout(context) {

    companion object {
        // Shared across all wrapper instances, one background thread. ReadableArray/ReadableMap
        // parsing and marker-icon decoding (JNI + bitmap I/O) happen here instead of the UI
        // thread, so a large compositionMarkers() batch (e.g. 20k+ markers) doesn't freeze the
        // map screen while it loads. Single-threaded so that commits from overlapping
        // compositionMarkers/updateMarker/clearOverlays calls on the same view are applied to
        // `markerStates` in the order React Native issued them.
        private val markerIngestDispatcher: CoroutineDispatcher =
            Executors.newSingleThreadExecutor { r ->
                Thread(r, "MapLibreMarkerIngest").apply { isDaemon = true }
            }.asCoroutineDispatcher()
    }

    private val mainCoroutine: CoroutineScope = CoroutineScope(Dispatchers.Main)
    private val markerCoroutine: CoroutineScope = CoroutineScope(markerIngestDispatcher)
    private val composeView = ComposeView(context)
    private val mapViewState = MapLibreViewState(
        id = "maplibre-${UUID.randomUUID()}",
        mapDesignType = ComposeMapLibreDesign.DemoTiles
    )
    private var markerStates by mutableStateOf<Map<String, MarkerState>>(emptyMap())
    private var rasterLayerController: MapLibreRasterLayerController? = null
    private var rasterLayerStates: Map<String, com.mapconductor.core.raster.RasterLayerState> = emptyMap()
    private var markerTilingOptions by mutableStateOf(MarkerTilingOptions.Default)
    private var infoBubblePositions: List<MapLibreWrapperInfoBubblePosition> = emptyList()
    private val nativeMapExtensionHost =
        NativeMapExtensionHostState(context) { extensionId, eventName, payload ->
            emit(
                "topNativeMapExtensionEvent",
                Arguments.createMap().apply {
                    putString("extensionId", extensionId)
                    putString("eventName", eventName)
                    putMap("payload", payload)
                },
            )
        }

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
                markerTiling = markerTilingOptions,
                onMapLoaded = {
                    rasterLayerController =
                        mapViewState.getControllers()?.get("raster_layer") as? MapLibreRasterLayerController
                    mainCoroutine.launch {
                        rasterLayerController?.add(rasterLayerStates.values.toList())
                    }
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
                with(nativeMapExtensionHost) { RenderExtensions() }
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

    fun setMarkerTilingOptions(options: ReadableMap?) {
        markerTilingOptions = markerTilingOptionsFromReadableMap(options)
    }

    fun clearOverlays() {
        // Routed through markerCoroutine so it's ordered against any in-flight
        // compositionMarkers/updateMarker call on the same queue.
        markerCoroutine.launch {
            withContext(Dispatchers.Main) {
                markerStates = emptyMap()
                infoBubblePositions = emptyList()
                emitMarkerScreenPositions()
                emitInfoBubbleScreenPositions()
            }
        }
    }

    fun compositionMarkers(payload: ReadableMap?) {
        val previousStates = markerStates
        markerCoroutine.launch {
            val nextStates =
                markerStatesFromBatchReadableMap(payload)
                    .associate { it.id to it.toCoreMarkerState(previousStates[it.id]) }
            withContext(Dispatchers.Main) {
                markerStates = nextStates
                emitMarkerScreenPositions()
                emitInfoBubbleScreenPositions()
            }
        }
    }

    fun updateMarker(marker: ReadableMap?) {
        val previousStates = markerStates
        markerCoroutine.launch {
            val state = ReactNativeMarkerState.fromReadableMap(marker) ?: return@launch
            val next = state.toCoreMarkerState(previousStates[state.id])
            withContext(Dispatchers.Main) {
                markerStates = markerStates + (state.id to next)
                state.animation?.let(next::animate)
                emitMarkerScreenPositions()
                emitInfoBubbleScreenPositions()
            }
        }
    }

    fun compositionRasterLayers(layers: ReadableArray?) {
        val states = rasterLayerStatesFromReadableArray(layers)
        rasterLayerStates = states.associateBy { it.id }
        mainCoroutine.launch {
            rasterLayerController?.clear()
            rasterLayerController?.add(states)
        }
    }

    fun updateRasterLayer(layer: ReadableMap?) {
        val state = rasterLayerStateFromReadableMap(layer) ?: return
        rasterLayerStates = rasterLayerStates + (state.id to state)
        mainCoroutine.launch {
            rasterLayerController?.update(state)
        }
    }

    fun upsertNativeMapExtension(
        extensionId: String,
        type: String,
        payload: ReadableMap?,
    ) {
        nativeMapExtensionHost.upsert(extensionId, type, payload)
    }

    fun removeNativeMapExtension(extensionId: String) {
        nativeMapExtensionHost.remove(extensionId)
    }

    fun onDropViewInstance() {
        nativeMapExtensionHost.clear()
        markerCoroutine.cancel()
    }

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
            if (markerStates.size >= markerTilingOptions.minMarkerCount) {
                emit(
                    "topMarkerScreenPositions",
                    Arguments.createMap().apply { putArray("positions", Arguments.createArray()) },
                )
                return@launch
            }
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
        val resolvedIcon = icon?.toMarkerIcon(context)
        val next =
            previous ?: MarkerState(
                id = id,
                position = position,
                clickable = clickable,
                draggable = draggable,
                zIndex = zIndex?.toInt(),
                icon = resolvedIcon,
                onClick = {
                    emit("topMarkerClick", Arguments.createMap().apply { putString("markerId", id) })
                },
            )

        next.position = position
        next.clickable = clickable
        next.draggable = draggable
        next.zIndex = zIndex?.toInt()
        next.icon = resolvedIcon
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

private fun markerTilingOptionsFromReadableMap(map: ReadableMap?): MarkerTilingOptions {
    if (map == null) return MarkerTilingOptions.Default
    return MarkerTilingOptions.Default.copy(
        enabled = map.getBooleanOrNull("enabled") ?: MarkerTilingOptions.Default.enabled,
        debugTileOverlay = map.getBooleanOrNull("debugTileOverlay")
            ?: MarkerTilingOptions.Default.debugTileOverlay,
        minMarkerCount = map.getIntOrNull("minMarkerCount") ?: MarkerTilingOptions.Default.minMarkerCount,
        cacheSize = map.getIntOrNull("cacheSize") ?: MarkerTilingOptions.Default.cacheSize,
    )
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
