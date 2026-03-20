package com.acts.asset.storage

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("acts.storage")
data class AssetStorageProperties(
    val bucket: String = "acts-assets",
    val endpoint: String = "http://localhost:4566",
    val region: String = "ap-northeast-2",
    val accessKey: String = "test",
    val secretKey: String = "test",
    val pathStyleAccessEnabled: Boolean = true,
    val autoCreateBucket: Boolean = true,
)
