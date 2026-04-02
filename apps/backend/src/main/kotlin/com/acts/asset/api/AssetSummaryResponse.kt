package com.acts.asset.api

import com.acts.asset.domain.AssetSourceKind
import com.acts.asset.domain.AssetType
import java.time.Instant

data class AssetSummaryResponse(
    val id: Long,
    val title: String,
    val type: AssetType,
    val sourceKind: AssetSourceKind,
    val description: String?,
    val originalFileName: String,
    val mimeType: String,
    val fileSizeBytes: Long,
    val fileExtension: String?,
    val linkUrl: String?,
    val linkType: String?,
    val versionNumber: Int,
    val ownerEmail: String,
    val ownerName: String,
    val organizationId: Long?,
    val organizationName: String?,
    val widthPx: Int?,
    val heightPx: Int?,
    val durationMs: Long?,
    val typeMetadata: AssetTypeMetadataResponse,
    val tags: AssetStructuredTagsResponse,
    val searchText: String,
    val canEdit: Boolean,
    val canDelete: Boolean,
    val canDownload: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)
