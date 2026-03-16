package com.acts.asset

import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream
import javax.imageio.ImageIO

@Component
class AssetMetadataExtractor {
    fun extract(
        assetType: AssetType,
        contentBytes: ByteArray,
    ): ExtractedAssetMetadata {
        if (assetType != AssetType.IMAGE) {
            return ExtractedAssetMetadata()
        }

        val image = ByteArrayInputStream(contentBytes).use { inputStream ->
            ImageIO.read(inputStream)
        } ?: return ExtractedAssetMetadata()

        return ExtractedAssetMetadata(
            widthPx = image.width,
            heightPx = image.height,
        )
    }
}

data class ExtractedAssetMetadata(
    val widthPx: Int? = null,
    val heightPx: Int? = null,
    val durationMs: Long? = null,
)
