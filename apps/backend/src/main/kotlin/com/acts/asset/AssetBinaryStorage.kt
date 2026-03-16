package com.acts.asset

interface AssetBinaryStorage {
    fun store(
        objectKey: String,
        contentType: String,
        content: ByteArray,
    ): StoredAssetObject
}

data class StoredAssetObject(
    val bucket: String,
    val objectKey: String,
)
