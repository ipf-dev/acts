package com.acts.asset

data class AssetDownloadResult(
    val content: ByteArray,
    val contentType: String,
    val fileName: String,
)
