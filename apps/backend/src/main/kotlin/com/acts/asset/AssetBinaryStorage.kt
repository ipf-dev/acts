package com.acts.asset

interface AssetBinaryStorage {
    fun store(
        objectKey: String,
        contentType: String,
        content: ByteArray,
    ): StoredAssetObject

    fun load(
        bucket: String,
        objectKey: String,
    ): LoadedAssetObject
}

data class StoredAssetObject(
    val bucket: String,
    val objectKey: String,
)

data class LoadedAssetObject(
    val content: ByteArray,
    val contentType: String?,
)
