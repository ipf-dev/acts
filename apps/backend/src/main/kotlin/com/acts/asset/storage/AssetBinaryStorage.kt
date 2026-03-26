package com.acts.asset.storage

interface AssetBinaryStorage {
    fun presignUploadUrl(
        objectKey: String,
        contentType: String,
        expirationMinutes: Long = 15,
    ): String

    fun presignDownloadUrl(
        bucket: String,
        objectKey: String,
        contentType: String,
        contentDisposition: String,
        expirationMinutes: Long = 15,
    ): String

    fun store(
        objectKey: String,
        contentType: String,
        content: ByteArray,
    ): StoredAssetObject

    fun load(
        bucket: String,
        objectKey: String,
    ): LoadedAssetObject

    fun loadOrNull(
        bucket: String,
        objectKey: String,
    ): LoadedAssetObject?

    fun exists(
        bucket: String,
        objectKey: String,
    ): Boolean
}

data class StoredAssetObject(
    val bucket: String,
    val objectKey: String,
)

data class LoadedAssetObject(
    val content: ByteArray,
    val contentType: String?,
)
