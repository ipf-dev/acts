package com.acts.asset.event

import com.acts.asset.domain.AssetEntity

data class AssetAccessScopeAuditSnapshot(
    val assetId: Long,
    val title: String,
    val organizationId: Long?,
    val organizationName: String?,
    val ownerEmail: String,
) {
    companion object {
        fun from(asset: AssetEntity): AssetAccessScopeAuditSnapshot = AssetAccessScopeAuditSnapshot(
            assetId = requireNotNull(asset.id),
            title = asset.title,
            organizationId = asset.organization?.id,
            organizationName = asset.organization?.name,
            ownerEmail = asset.ownerEmail,
        )
    }
}
