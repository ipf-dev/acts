package com.acts.asset

interface AssetRepositoryCustom {
    fun findCatalogPage(query: AssetListQuery, offset: Int, limit: Int): AssetCatalogQueryResult

    fun findCatalogFilterOptions(): AssetCatalogFilterOptionsResult
}

data class AssetCatalogQueryResult(
    val assets: List<AssetEntity>,
    val totalCount: Long,
)

data class AssetCatalogFilterOptionsResult(
    val organizations: List<AssetCatalogOrganizationOptionResult>,
    val creators: List<AssetCatalogCreatorOptionResult>,
)

data class AssetCatalogOrganizationOptionResult(
    val id: Long,
    val name: String,
)

data class AssetCatalogCreatorOptionResult(
    val email: String,
    val name: String,
)
