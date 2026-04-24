package com.acts.project

import com.acts.asset.api.AssetSummaryResponse
import com.acts.asset.domain.AssetAccessAction
import com.acts.asset.domain.AssetAuthorizationService
import com.acts.asset.service.AssetCatalogService
import com.acts.asset.service.requireActor
import com.acts.auth.org.OrganizationEntity
import com.acts.auth.org.OrganizationRepository
import com.acts.auth.user.UserAccountEntity
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Service
class ProjectService(
    private val assetAuthorizationService: AssetAuthorizationService,
    private val assetCatalogService: AssetCatalogService,
    private val organizationRepository: OrganizationRepository,
    private val projectAssetRepository: ProjectAssetRepository,
    private val projectRepository: ProjectRepository,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun listNavigation(actorEmail: String): ProjectNavigationResponse {
        requireAuthorizedActor(actorEmail)

        val projects = projectRepository.findAllByOrderByCreatedAtDesc()
        val summaries = projects.map(::toSummaryResponse)

        return ProjectNavigationResponse(
            ongoing = summaries.filter { it.status == ProjectStatus.ONGOING },
            inProgress = summaries.filter { it.status == ProjectStatus.IN_PROGRESS },
            completed = summaries.filter { it.status == ProjectStatus.COMPLETED },
        )
    }

    @Transactional
    fun listOrganizations(actorEmail: String): List<ProjectOrganizationResponse> {
        requireAuthorizedActor(actorEmail)
        return organizationRepository.findAllByOrderByNameAsc().map { organization ->
            ProjectOrganizationResponse(
                id = requireNotNull(organization.id),
                name = organization.name,
            )
        }
    }

    @Transactional
    fun createProject(request: ProjectCreateRequest, actorEmail: String): ProjectDetailResponse {
        val actor = requireAuthorizedActor(actorEmail)

        val normalizedName = normalizeProjectName(request.name)
        val normalizedDescription = normalizeProjectDescription(request.description)
        val organization = requireOrganization(request.organizationId)
        validateDeadline(request.deadline)

        val project = projectRepository.save(
            ProjectEntity(
                slug = generateUniqueSlug(normalizedName),
                name = normalizedName,
                description = normalizedDescription,
                organization = organization,
                deadline = request.deadline,
                completedAt = null,
                createdBy = actor,
            ),
        )

        return buildDetailResponse(actor, project, emptyList())
    }

    @Transactional
    fun getProject(projectKey: String, actorEmail: String): ProjectDetailResponse {
        val actor = requireAuthorizedActor(actorEmail)

        val project = requireProject(projectKey)
        val projectId = requireNotNull(project.id)
        val projectAssets = projectAssetRepository.findAllByProject_IdOrderByCreatedAtAscIdAsc(projectId)
        return buildDetailResponse(actor, project, projectAssets)
    }

    @Transactional
    fun updateProject(
        projectKey: String,
        request: ProjectUpdateRequest,
        actorEmail: String,
    ): ProjectDetailResponse {
        val actor = requireAuthorizedActor(actorEmail)

        val project = requireProject(projectKey)
        project.name = normalizeProjectName(request.name)
        project.description = normalizeProjectDescription(request.description)
        project.organization = requireOrganization(request.organizationId)
        validateDeadline(request.deadline)
        project.deadline = request.deadline
        project.completedAt = when {
            request.completed && project.completedAt == null -> Instant.now()
            !request.completed -> null
            else -> project.completedAt
        }

        val saved = projectRepository.save(project)
        val projectAssets = projectAssetRepository.findAllByProject_IdOrderByCreatedAtAscIdAsc(
            requireNotNull(saved.id),
        )
        return buildDetailResponse(actor, saved, projectAssets)
    }

    @Transactional
    fun deleteProject(projectKey: String, actorEmail: String) {
        requireAuthorizedActor(actorEmail)

        val project = requireProject(projectKey)
        projectRepository.delete(project)
    }

    @Transactional
    fun linkAsset(projectKey: String, assetId: Long, actorEmail: String): ProjectDetailResponse {
        require(assetId > 0) { "연결할 에셋이 필요합니다." }
        val actor = requireAuthorizedActor(actorEmail)

        val project = requireProject(projectKey)
        val projectId = requireNotNull(project.id)
        val asset = assetCatalogService.requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(actor, asset, AssetAccessAction.DETAIL_VIEW)

        if (!projectAssetRepository.existsByProject_IdAndAsset_Id(projectId, assetId)) {
            projectAssetRepository.save(
                ProjectAssetEntity(
                    project = project,
                    asset = asset,
                    linkedBy = actor,
                ),
            )
        }

        val projectAssets = projectAssetRepository.findAllByProject_IdOrderByCreatedAtAscIdAsc(projectId)
        return buildDetailResponse(actor, project, projectAssets)
    }

    @Transactional
    fun unlinkAsset(projectKey: String, assetId: Long, actorEmail: String): ProjectDetailResponse {
        val actor = requireAuthorizedActor(actorEmail)

        val project = requireProject(projectKey)
        val projectId = requireNotNull(project.id)
        val projectAsset = projectAssetRepository.findByProject_IdAndAsset_Id(projectId, assetId)
            ?: throw IllegalArgumentException("프로젝트에 연결된 에셋을 찾을 수 없습니다.")
        projectAssetRepository.delete(projectAsset)

        val projectAssets = projectAssetRepository.findAllByProject_IdOrderByCreatedAtAscIdAsc(projectId)
        return buildDetailResponse(actor, project, projectAssets)
    }

    private fun requireAuthorizedActor(actorEmail: String): UserAccountEntity {
        val actor = requireActor(userAccountRepository, actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)
        return actor
    }

    private fun requireProject(projectKey: String): ProjectEntity =
        projectRepository.findBySlug(projectKey)
            ?: throw NoSuchElementException("프로젝트를 찾을 수 없습니다.")

    private fun requireOrganization(organizationId: Long): OrganizationEntity =
        organizationRepository.findById(organizationId).orElseThrow {
            IllegalArgumentException("담당 팀을 찾을 수 없습니다.")
        }

    private fun validateDeadline(deadline: LocalDate?) {
        if (deadline == null) {
            return
        }
        require(deadline.year in 2000..2999) { "마감일이 올바르지 않습니다." }
    }

    private fun generateUniqueSlug(name: String): String {
        val baseSlug = slugifyProjectName(name).ifBlank { "project-${UUID.randomUUID().toString().take(8)}" }
        var candidate = baseSlug
        var suffix = 2

        while (projectRepository.existsBySlug(candidate)) {
            candidate = "${baseSlug.take(72)}-$suffix"
            suffix += 1
        }

        return candidate
    }

    private fun deriveStatus(project: ProjectEntity): ProjectStatus = when {
        project.completedAt != null -> ProjectStatus.COMPLETED
        project.deadline == null -> ProjectStatus.ONGOING
        else -> ProjectStatus.IN_PROGRESS
    }

    private fun toSummaryResponse(project: ProjectEntity): ProjectSummaryResponse =
        ProjectSummaryResponse(
            key = project.slug,
            name = project.name,
            organizationId = requireNotNull(project.organization.id),
            organizationName = project.organization.name,
            deadline = project.deadline,
            completedAt = project.completedAt,
            status = deriveStatus(project),
        )

    private fun buildDetailResponse(
        actor: UserAccountEntity,
        project: ProjectEntity,
        projectAssets: List<ProjectAssetEntity>,
    ): ProjectDetailResponse {
        val linkedAssetSummaries: List<AssetSummaryResponse> = if (projectAssets.isEmpty()) {
            emptyList()
        } else {
            val linkedAssets = projectAssets.map(ProjectAssetEntity::asset)
            assetCatalogService.buildSummaryResponses(actor, linkedAssets)
        }

        return ProjectDetailResponse(
            key = project.slug,
            name = project.name,
            description = project.description,
            organizationId = requireNotNull(project.organization.id),
            organizationName = project.organization.name,
            deadline = project.deadline,
            completedAt = project.completedAt,
            status = deriveStatus(project),
            createdAt = project.createdAt,
            updatedAt = project.updatedAt,
            linkedAssets = linkedAssetSummaries,
        )
    }
}
