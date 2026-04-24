package com.acts.project

import com.acts.asset.api.AssetSummaryResponse
import java.time.Instant
import java.time.LocalDate

enum class ProjectStatus {
    ONGOING,
    IN_PROGRESS,
    COMPLETED,
}

data class ProjectSummaryResponse(
    val key: String,
    val name: String,
    val organizationId: Long,
    val organizationName: String,
    val deadline: LocalDate?,
    val completedAt: Instant?,
    val status: ProjectStatus,
)

data class ProjectDetailResponse(
    val key: String,
    val name: String,
    val description: String?,
    val organizationId: Long,
    val organizationName: String,
    val deadline: LocalDate?,
    val completedAt: Instant?,
    val status: ProjectStatus,
    val createdAt: Instant,
    val updatedAt: Instant,
    val linkedAssets: List<AssetSummaryResponse>,
)

data class ProjectNavigationResponse(
    val ongoing: List<ProjectSummaryResponse>,
    val inProgress: List<ProjectSummaryResponse>,
    val completed: List<ProjectSummaryResponse>,
)

data class ProjectOrganizationResponse(
    val id: Long,
    val name: String,
)
