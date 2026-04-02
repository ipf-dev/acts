package com.acts.asset.api

data class AssetDownloadResult(
    val content: ByteArray,
    val contentType: String,
    val fileName: String,
)
