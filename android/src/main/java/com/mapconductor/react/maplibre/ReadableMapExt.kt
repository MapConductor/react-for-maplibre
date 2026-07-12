package com.mapconductor.react.maplibre

import com.facebook.react.bridge.ReadableMap

fun ReadableMap.getDoubleOrNull(name: String): Double? =
    if (hasKey(name) && !isNull(name)) getDouble(name) else null
