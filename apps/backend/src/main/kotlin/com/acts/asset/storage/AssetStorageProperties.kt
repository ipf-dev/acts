package com.acts.asset.storage

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("acts.storage")
data class AssetStorageProperties(
    val bucket: String,
    val accessUrlExpirationMinutes: Long = 15,
    val region: String = "ap-northeast-2",
    val transferAccelerationEnabled: Boolean = true,
)
