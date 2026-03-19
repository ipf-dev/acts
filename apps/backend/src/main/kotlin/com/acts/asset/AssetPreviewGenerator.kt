package com.acts.asset

interface AssetPreviewGenerator {
    fun generateVideoPreview(
        originalFileName: String,
        contentBytes: ByteArray,
    ): GeneratedAssetPreview?
}

data class GeneratedAssetPreview(
    val content: ByteArray,
    val contentType: String,
)
