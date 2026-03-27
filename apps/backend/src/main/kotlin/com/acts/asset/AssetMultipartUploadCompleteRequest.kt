package com.acts.asset

data class AssetMultipartUploadCompleteRequest(
    val uploadId: String,
    val objectKey: String,
    val fileSizeBytes: Long,
    val widthPx: Int? = null,
    val heightPx: Int? = null,
    val parts: List<CompletedPartInput>,
)

data class CompletedPartInput(
    val partNumber: Int,
    val eTag: String,
)
