package com.acts.asset.service

import com.acts.asset.domain.AssetEntity
import com.acts.asset.event.AssetEventEntity
import com.acts.asset.event.AssetEventRepository
import com.acts.asset.event.AssetEventType
import com.acts.asset.repository.AssetRepository
import com.acts.asset.retention.AssetRetentionPolicyEntity
import com.acts.asset.retention.AssetRetentionPolicyRepository
import com.acts.asset.retention.AssetRetentionPolicyResponse
import com.acts.asset.retention.AssetRetentionPolicyUpdateRequest
import com.acts.asset.retention.DeletedAssetSummaryResponse
import com.acts.auth.domain.UserRole
import com.acts.auth.audit.AdminAuditLogService
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class AssetLifecycleService(
    private val adminAuditLogService: AdminAuditLogService,
    private val assetEventRepository: AssetEventRepository,
    private val assetRepository: AssetRepository,
    private val assetRetentionPolicyRepository: AssetRetentionPolicyRepository,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun getRetentionPolicy(actorEmail: String): AssetRetentionPolicyResponse {
        requireAdmin(actorEmail)
        return requireRetentionPolicy().toResponse()
    }

    @Transactional
    fun updateRetentionPolicy(
        request: AssetRetentionPolicyUpdateRequest,
        actorEmail: String,
        actorName: String?,
    ): AssetRetentionPolicyResponse {
        require(request.trashRetentionDays in 1..3650) { "휴지통 보관 기간은 1일 이상이어야 합니다." }

        val actor = requireAdmin(actorEmail)
        val policy = requireRetentionPolicy()
        val beforeState = AssetRetentionPolicyAuditSnapshot.from(policy)

        policy.trashRetentionDays = request.trashRetentionDays
        policy.restoreEnabled = request.restoreEnabled
        policy.updatedByEmail = actor.email
        policy.updatedByName = actorName ?: actor.displayName

        val savedPolicy = assetRetentionPolicyRepository.save(policy)
        val afterState = AssetRetentionPolicyAuditSnapshot.from(savedPolicy)

        adminAuditLogService.recordAssetRetentionPolicyUpdated(
            actorEmail = actor.email,
            actorName = actorName ?: actor.displayName,
            beforeState = beforeState,
            afterState = afterState,
        )

        return savedPolicy.toResponse()
    }

    @Transactional
    fun listDeletedAssets(actorEmail: String): List<DeletedAssetSummaryResponse> {
        requireAdmin(actorEmail)
        val policy = requireRetentionPolicy()
        val now = Instant.now()

        return assetRepository.findAllByDeletedAtIsNotNullOrderByDeletedAtDescIdDesc()
            .map { asset ->
                val deletedAt = requireNotNull(asset.deletedAt)
                val restoreDeadlineAt = deletedAt.plus(policy.trashRetentionDays.toLong(), ChronoUnit.DAYS)

                DeletedAssetSummaryResponse(
                    id = requireNotNull(asset.id),
                    title = asset.title,
                    type = asset.assetType,
                    ownerEmail = asset.ownerEmail,
                    ownerName = asset.ownerName,
                    organizationName = asset.organization?.name,
                    originalFileName = asset.originalFileName,
                    deletedAt = deletedAt,
                    deletedByEmail = asset.deletedByEmail,
                    deletedByName = asset.deletedByName,
                    restoreDeadlineAt = restoreDeadlineAt,
                    canRestore = policy.restoreEnabled && now.isBefore(restoreDeadlineAt),
                )
            }
    }

    @Transactional
    fun restoreAsset(
        assetId: Long,
        actorEmail: String,
        actorName: String?,
    ) {
        val actor = requireActor(actorEmail)
        val asset = requireDeletedAsset(assetId)
        val policy = requireRetentionPolicy()
        val deletedAt = requireNotNull(asset.deletedAt)
        val restoreDeadlineAt = deletedAt.plus(policy.trashRetentionDays.toLong(), ChronoUnit.DAYS)

        if (!policy.restoreEnabled) {
            throw IllegalStateException("복구가 비활성화되어 있습니다.")
        }

        if (Instant.now().isAfter(restoreDeadlineAt)) {
            throw IllegalStateException("복구 가능 기간이 지났습니다.")
        }

        if (!canManageLifecycle(actor.role, actor.email, asset)) {
            throw SecurityException("복구 권한이 없습니다.")
        }

        val beforeState = AssetLifecycleAuditSnapshot.from(asset, restoreDeadlineAt)

        asset.deletedAt = null
        asset.deletedByEmail = null
        asset.deletedByName = null
        assetRepository.save(asset)

        assetEventRepository.save(
            AssetEventEntity(
                asset = asset,
                eventType = AssetEventType.RESTORED,
                actorEmail = actor.email,
                actorName = actorName ?: actor.displayName,
                detail = "자산이 휴지통에서 복구되었습니다.",
            ),
        )

        adminAuditLogService.recordAssetRestored(
            actorEmail = actor.email,
            actorName = actorName ?: actor.displayName,
            asset = asset,
            beforeState = beforeState,
            afterState = AssetLifecycleAuditSnapshot.from(asset, null),
        )
    }

    private fun requireRetentionPolicy(): AssetRetentionPolicyEntity = assetRetentionPolicyRepository.findFirstByOrderByUpdatedAtDescIdDesc()
        ?: throw IllegalStateException("자산 보관 정책이 없습니다.")

    private fun requireActor(actorEmail: String) = userAccountRepository.findById(actorEmail.lowercase())
        .orElseThrow { IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.") }

    private fun requireAdmin(actorEmail: String) = requireActor(actorEmail).also { actor ->
        if (actor.role != UserRole.ADMIN) {
            throw SecurityException("관리자 권한이 없습니다.")
        }
    }

    private fun requireDeletedAsset(assetId: Long): AssetEntity = assetRepository.findById(assetId)
        .orElseThrow { IllegalArgumentException("삭제된 자산을 찾을 수 없습니다.") }
        .also { asset ->
            if (asset.deletedAt == null) {
                throw IllegalArgumentException("삭제된 자산을 찾을 수 없습니다.")
            }
        }

    private fun canManageLifecycle(
        role: UserRole,
        actorEmail: String,
        asset: AssetEntity,
    ): Boolean {
        if (role == UserRole.ADMIN) {
            return true
        }

        return asset.ownerEmail.equals(actorEmail, ignoreCase = true)
    }

    private fun AssetRetentionPolicyEntity.toResponse(): AssetRetentionPolicyResponse = AssetRetentionPolicyResponse(
        trashRetentionDays = trashRetentionDays,
        restoreEnabled = restoreEnabled,
        updatedByEmail = updatedByEmail,
        updatedByName = updatedByName,
        updatedAt = updatedAt,
    )
}

data class AssetRetentionPolicyAuditSnapshot(
    val trashRetentionDays: Int,
    val restoreEnabled: Boolean,
) {
    companion object {
        fun from(policy: AssetRetentionPolicyEntity): AssetRetentionPolicyAuditSnapshot = AssetRetentionPolicyAuditSnapshot(
            trashRetentionDays = policy.trashRetentionDays,
            restoreEnabled = policy.restoreEnabled,
        )
    }
}

data class AssetLifecycleAuditSnapshot(
    val assetId: Long,
    val title: String,
    val ownerEmail: String,
    val deletedAt: Instant?,
    val deletedByEmail: String?,
    val restoreDeadlineAt: Instant?,
) {
    companion object {
        fun from(asset: AssetEntity, restoreDeadlineAt: Instant?): AssetLifecycleAuditSnapshot = AssetLifecycleAuditSnapshot(
            assetId = requireNotNull(asset.id),
            title = asset.title,
            ownerEmail = asset.ownerEmail,
            deletedAt = asset.deletedAt,
            deletedByEmail = asset.deletedByEmail,
            restoreDeadlineAt = restoreDeadlineAt,
        )
    }
}
