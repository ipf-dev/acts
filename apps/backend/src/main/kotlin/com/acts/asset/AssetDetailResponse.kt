package com.acts.asset

import java.time.Instant

data class AssetDetailResponse(
    val id: Long,
    val title: String,
    val type: AssetType,
    val status: AssetStatus,
    val description: String?,
    val sourceType: AssetSourceType,
    val sourceDetail: String?,
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
    val createdAt: Instant,
    val updatedAt: Instant,
    val currentFile: AssetFileResponse,
    val events: List<AssetEventResponse>,
)

data class AssetFileResponse(
    val bucketName: String,
    val objectKey: String,
    val originalFileName: String,
    val mimeType: String,
    val fileSizeBytes: Long,
    val checksumSha256: String,
    val versionNumber: Int,
    val createdByEmail: String,
    val createdByName: String,
    val createdAt: Instant,
)

data class AssetEventResponse(
    val eventType: AssetEventType,
    val actorEmail: String,
    val actorName: String?,
    val detail: String?,
    val createdAt: Instant,
)
