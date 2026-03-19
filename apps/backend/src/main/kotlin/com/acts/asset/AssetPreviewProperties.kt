package com.acts.asset

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("acts.preview")
data class AssetPreviewProperties(
    val ffmpegPath: String? = null,
)
