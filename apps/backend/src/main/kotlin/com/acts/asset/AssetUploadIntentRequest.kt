package com.acts.asset

data class AssetUploadIntentRequest(
    val fileName: String,
    val contentType: String,
    val fileSizeBytes: Long,
    val title: String? = null,
    val description: String? = null,
    val tags: List<String> = emptyList(),
)
