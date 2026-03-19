package com.acts.asset

data class AssetUpdateRequest(
    val title: String,
    val description: String?,
    val tags: List<String>,
    val organizationId: Long? = null,
)
