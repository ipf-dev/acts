package com.acts.asset.api

data class AssetMultipartUploadIntentResponse(
    val assetId: Long,
    val uploadId: String,
    val objectKey: String,
    val partSize: Long,
    val parts: List<PresignedPartUrl>,
)

data class PresignedPartUrl(
    val partNumber: Int,
    val presignedUrl: String,
)
