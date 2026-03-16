package com.acts.asset

data class AssetListQuery(
    val search: String? = null,
    val assetType: AssetType? = null,
    val organizationId: Long? = null,
    val creatorEmail: String? = null,
)
