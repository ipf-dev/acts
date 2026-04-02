package com.acts.asset.api

import java.time.Instant

data class AssetFileAccessUrlResponse(
    val url: String,
    val fileName: String,
    val contentType: String,
    val expiresAt: Instant,
    val mode: AssetFileAccessMode,
)
