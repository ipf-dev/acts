package com.acts.asset

data class AssetCatalogPageResponse(
    val items: List<AssetSummaryResponse>,
    val page: Int,
    val size: Int,
    val totalItems: Long,
    val totalPages: Int,
    val hasNext: Boolean,
    val hasPrevious: Boolean,
)
