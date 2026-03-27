package com.acts.asset.preview

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("acts.preview")
data class AssetPreviewProperties(
    val videoThumbnailLambdaFunctionName: String? = null,
)
