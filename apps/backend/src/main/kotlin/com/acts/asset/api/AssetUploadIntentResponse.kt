package com.acts.asset.api

data class AssetUploadIntentResponse(
    val assetId: Long,
    val presignedUrl: String,
    val objectKey: String,
)
