package com.acts.asset.api

data class AssetUploadCommand(
    val actorEmail: String,
    val actorName: String?,
    val title: String?,
    val description: String?,
    val requestedTags: List<String>,
    val fileName: String,
    val contentType: String?,
    val contentBytes: ByteArray,
)
