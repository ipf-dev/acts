package com.acts.asset

data class AssetCatalogFilterOptionsResponse(
    val organizations: List<AssetCatalogOrganizationOptionResponse>,
    val creators: List<AssetCatalogCreatorOptionResponse>,
)

data class AssetCatalogOrganizationOptionResponse(
    val id: Long,
    val name: String,
)

data class AssetCatalogCreatorOptionResponse(
    val email: String,
    val name: String,
)
