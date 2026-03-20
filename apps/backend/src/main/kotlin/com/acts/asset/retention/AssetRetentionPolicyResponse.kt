package com.acts.asset.retention

import com.acts.asset.AssetType
import java.time.Instant

data class AssetRetentionPolicyResponse(
    val trashRetentionDays: Int,
    val restoreEnabled: Boolean,
    val updatedByEmail: String,
    val updatedByName: String?,
    val updatedAt: Instant,
)

data class DeletedAssetSummaryResponse(
    val id: Long,
    val title: String,
    val type: AssetType,
    val ownerEmail: String,
    val ownerName: String,
    val organizationName: String?,
    val originalFileName: String,
    val deletedAt: Instant,
    val deletedByEmail: String?,
    val deletedByName: String?,
    val restoreDeadlineAt: Instant,
    val canRestore: Boolean,
)
