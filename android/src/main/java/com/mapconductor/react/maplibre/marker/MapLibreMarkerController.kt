package com.mapconductor.react.maplibre.marker

import android.animation.ValueAnimator
import android.graphics.PointF
import android.view.animation.BounceInterpolator
import android.view.animation.LinearInterpolator
import com.mapconductor.core.features.GeoPoint
import com.mapconductor.core.ResourceProvider
import com.mapconductor.core.marker.DefaultMarkerIcon
import com.mapconductor.core.marker.MarkerAnimation
import com.mapconductor.react.maplibre.MapLibreViewHolder
import com.mapconductor.react.maplibre.toLatLng
import org.maplibre.android.maps.Style
import org.maplibre.android.style.expressions.Expression.get
import org.maplibre.android.style.layers.PropertyFactory.iconAllowOverlap
import org.maplibre.android.style.layers.PropertyFactory.iconAnchor
import org.maplibre.android.style.layers.PropertyFactory.iconIgnorePlacement
import org.maplibre.android.style.layers.PropertyFactory.iconImage
import org.maplibre.android.style.layers.PropertyFactory.iconOffset
import org.maplibre.android.style.layers.PropertyFactory.symbolSortKey
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.geojson.Feature
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.Point
import kotlin.math.hypot

class MapLibreMarkerController(
    private val holder: MapLibreViewHolder,
) {
    private val states = LinkedHashMap<String, ReactNativeMarkerState>()
    private val animators = LinkedHashMap<String, ValueAnimator>()
    private val defaultIcon = DefaultMarkerIcon().toBitmapIcon()

    private val sourceId = "mapconductor-rn-markers-source"
    private val layerId = "mapconductor-rn-markers-layer"
    private val defaultIconId = "mapconductor-rn-default-marker"

    fun onStyleLoaded(style: Style) {
        ensureStyle(style)
        redraw(style)
    }

    fun composition(data: List<ReactNativeMarkerState>) {
        states.clear()
        data.forEach { states[it.id] = it }
        holder.map.style?.let(::redraw)
    }

    fun update(state: ReactNativeMarkerState) {
        if (!states.containsKey(state.id)) return
        states[state.id] = state
        holder.map.style?.let(::redraw)
        state.animation?.let { animate(state.id, it) }
    }

    fun clear() {
        animators.values.forEach { it.cancel() }
        animators.clear()
        states.clear()
        holder.map.style?.let(::redraw)
    }

    fun markerState(id: String): ReactNativeMarkerState? = states[id]

    fun screenPositions(): List<MarkerScreenPosition> =
        states.values.map { state ->
            val point = holder.map.projection.toScreenLocation(state.position.toLatLng())
            MarkerScreenPosition(state.id, point.x.toDouble(), point.y.toDouble())
        }

    fun find(point: GeoPoint): ReactNativeMarkerState? {
        val touch = holder.map.projection.toScreenLocation(point.toLatLng())
        return states.values.minByOrNull { state ->
            val markerPoint = holder.map.projection.toScreenLocation(state.position.toLatLng())
            val dx = markerPoint.x - touch.x
            val dy = markerPoint.y - touch.y
            dx * dx + dy * dy
        }?.takeIf { state ->
            val markerPoint = holder.map.projection.toScreenLocation(state.position.toLatLng())
            hypot((markerPoint.x - touch.x).toDouble(), (markerPoint.y - touch.y).toDouble()) <= 48.0
        }
    }

    private fun ensureStyle(style: Style) {
        try {
            style.addImage(defaultIconId, defaultIcon.bitmap)
        } catch (_: Exception) {
        }
        states.values.forEach { state ->
            val iconId = state.customIconId() ?: return@forEach
            val bitmap = state.icon?.toMarkerIcon(holder.mapView.context)?.toBitmapIcon()?.bitmap ?: return@forEach
            try {
                style.addImage(iconId, bitmap)
            } catch (_: Exception) {
            }
        }

        if (style.getSource(sourceId) == null) {
            try {
                style.addSource(GeoJsonSource(sourceId, FeatureCollection.fromFeatures(emptyList<Feature>())))
            } catch (_: Exception) {
            }
        }

        if (style.getLayer(layerId) == null) {
            try {
                style.addLayer(
                    SymbolLayer(layerId, sourceId).withProperties(
                        iconImage(get(PROP_ICON_ID)),
                        iconAllowOverlap(true),
                        iconIgnorePlacement(true),
                        iconAnchor("top-left"),
                        iconOffset(get(PROP_ICON_OFFSET)),
                        symbolSortKey(get(PROP_Z_INDEX)),
                    ),
                )
            } catch (_: Exception) {
            }
        }
    }

    private fun redraw(style: Style) {
        ensureStyle(style)
        val features = states.values.map { it.toFeature() }
        val source = style.getSourceAs<GeoJsonSource>(sourceId)
        source?.setGeoJson(FeatureCollection.fromFeatures(features))
    }

    private fun ReactNativeMarkerState.toFeature(): Feature {
        val feature =
            Feature.fromGeometry(
                Point.fromLngLat(position.longitude, position.latitude),
                null,
                "marker-$id",
            )
        feature.addStringProperty(PROP_MARKER_ID, id)
        val bitmapIcon = icon?.toMarkerIcon(holder.mapView.context)?.toBitmapIcon()
        feature.addStringProperty(PROP_ICON_ID, if (bitmapIcon == null) defaultIconId else customIconId() ?: defaultIconId)
        feature.addNumberProperty(PROP_Z_INDEX, zIndex ?: 0f)
        feature.addProperty(
            PROP_ICON_OFFSET,
            com.google.gson.JsonArray().apply {
                val resolvedIcon = bitmapIcon ?: defaultIcon
                add(-(resolvedIcon.size.width * resolvedIcon.anchor.x) / ResourceProvider.getDensity())
                add(-(resolvedIcon.size.height * resolvedIcon.anchor.y) / ResourceProvider.getDensity())
            },
        )
        return feature
    }

    private fun ReactNativeMarkerState.customIconId(): String? =
        icon?.let { "mapconductor-rn-marker-icon-${id}-${it.hashCode()}" }

    private fun animate(
        id: String,
        animation: MarkerAnimation,
    ) {
        val state = states[id] ?: return
        val target = state.position
        val targetPoint = holder.map.projection.toScreenLocation(target.toLatLng())
        val startPoint = PointF(targetPoint.x, 0f)
        animators.remove(id)?.cancel()

        val animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration =
                when (animation) {
                    MarkerAnimation.Drop -> DROP_ANIMATE_DURATION
                    MarkerAnimation.Bounce -> BOUNCE_ANIMATE_DURATION
                }
            interpolator =
                when (animation) {
                    MarkerAnimation.Drop -> LinearInterpolator()
                    MarkerAnimation.Bounce -> BounceInterpolator()
                }
            addUpdateListener { valueAnimator ->
                val t = valueAnimator.animatedValue as Float
                val y = startPoint.y + ((targetPoint.y - startPoint.y) * t)
                val latLng = holder.map.projection.fromScreenLocation(PointF(targetPoint.x, y))
                states[id] = state.copy(position = GeoPoint.fromLatLong(latLng.latitude, latLng.longitude))
                holder.map.style?.let(::redraw)
            }
        }
        animator.addListener(
            object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: android.animation.Animator) {
                    states[id] = state.copy(position = target, animation = null)
                    holder.map.style?.let(::redraw)
                    animators.remove(id)
                }

                override fun onAnimationCancel(animation: android.animation.Animator) {
                    states[id] = state.copy(position = target, animation = null)
                    holder.map.style?.let(::redraw)
                    animators.remove(id)
                }
            },
        )
        animators[id] = animator
        animator.start()
    }

    companion object {
        private const val PROP_MARKER_ID = "marker_id"
        private const val PROP_ICON_ID = "icon_id"
        private const val PROP_ICON_OFFSET = "icon_offset"
        private const val PROP_Z_INDEX = "zIndex"
        private const val DROP_ANIMATE_DURATION = 300L
        private const val BOUNCE_ANIMATE_DURATION = 2000L
    }
}

data class MarkerScreenPosition(
    val markerId: String,
    val x: Double,
    val y: Double,
)
