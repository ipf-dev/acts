package com.acts.asset

data class AssetUploadIntentResponse(
    val assetId: Long,
    val presignedUrl: String,
    val objectKey: String,
)
