package com.acts.asset

data class AssetUploadCompleteRequest(
    val objectKey: String,
    val fileSizeBytes: Long,
    val widthPx: Int? = null,
    val heightPx: Int? = null,
)
