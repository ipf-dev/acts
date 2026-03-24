package com.acts.asset

import java.time.Instant

data class AssetSummaryResponse(
    val id: Long,
    val title: String,
    val type: AssetType,
    val status: AssetStatus,
    val description: String?,
    val originalFileName: String,
    val mimeType: String,
    val fileSizeBytes: Long,
    val fileExtension: String?,
    val versionNumber: Int,
    val ownerEmail: String,
    val ownerName: String,
    val organizationId: Long?,
    val organizationName: String?,
    val widthPx: Int?,
    val heightPx: Int?,
    val durationMs: Long?,
    val tags: List<String>,
    val canEdit: Boolean,
    val canDelete: Boolean,
    val canDownload: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)
