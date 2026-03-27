package com.acts.asset.preview

interface AssetPreviewDispatcher {
    fun requestVideoPreview(request: VideoPreviewDispatchRequest)
}

data class VideoPreviewDispatchRequest(
    val bucket: String,
    val objectKey: String,
    val previewObjectKey: String,
    val originalFileName: String,
)
