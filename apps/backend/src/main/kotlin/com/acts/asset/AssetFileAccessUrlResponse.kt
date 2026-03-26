package com.acts.asset

import java.time.Instant

data class AssetFileAccessUrlResponse(
    val url: String,
    val fileName: String,
    val contentType: String,
    val expiresAt: Instant,
    val mode: AssetFileAccessMode,
)
