package com.acts.auth.audit

import com.acts.asset.domain.AssetAccessAction
import com.acts.asset.domain.AssetEntity
import com.acts.asset.service.AssetLifecycleAuditSnapshot
import com.acts.asset.service.AssetRetentionPolicyAuditSnapshot
import com.acts.asset.event.AssetAccessScopeAuditSnapshot
import com.acts.auth.api.AuthUserProfile
import com.acts.auth.domain.UserRole
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service

@Service
class AdminAuditLogService(
    private val adminAuditLogRepository: AdminAuditLogRepository,
    private val objectMapper: ObjectMapper,
) {
    fun recordLoginSuccess(email: String, actorName: String?, role: UserRole) {
        saveAuditLog(
            category = AuditLogCategory.AUTH, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = email, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.LOGIN_SUCCESS,
            targetEmail = email, targetName = actorName.normalizedAuditName(),
            detail = "Google SSO 로그인 성공 (${role.name})", beforeState = null, afterState = null,
        )
    }

    fun recordUserAssignmentChange(actorEmail: String, actorName: String?, beforeProfile: AuthUserProfile, afterProfile: AuthUserProfile) {
        if (beforeProfile == afterProfile) return
        saveAuditLog(
            category = AuditLogCategory.PERMISSION, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.USER_ASSIGNMENT_UPDATED,
            targetEmail = afterProfile.email, targetName = afterProfile.displayName,
            detail = buildUserAssignmentDetail(beforeProfile, afterProfile),
            beforeState = objectMapper.writeValueAsString(UserAssignmentAuditSnapshot.from(beforeProfile)),
            afterState = objectMapper.writeValueAsString(UserAssignmentAuditSnapshot.from(afterProfile)),
        )
    }

    fun recordUserRolePromoted(actorEmail: String, actorName: String?, beforeProfile: AuthUserProfile, afterProfile: AuthUserProfile) {
        if (beforeProfile == afterProfile) return
        saveAuditLog(
            category = AuditLogCategory.PERMISSION, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.USER_ROLE_PROMOTED,
            targetEmail = afterProfile.email, targetName = afterProfile.displayName,
            detail = buildUserRolePromotionDetail(beforeProfile, afterProfile),
            beforeState = objectMapper.writeValueAsString(UserAssignmentAuditSnapshot.from(beforeProfile)),
            afterState = objectMapper.writeValueAsString(UserAssignmentAuditSnapshot.from(afterProfile)),
        )
    }

    fun recordUserFeatureAccessUpdated(
        actorEmail: String, actorName: String?, targetEmail: String, targetName: String?,
        beforeState: UserFeatureAccessAuditSnapshot, afterState: UserFeatureAccessAuditSnapshot,
    ) {
        if (beforeState == afterState) return
        saveAuditLog(
            category = AuditLogCategory.PERMISSION, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.USER_FEATURE_ACCESS_UPDATED,
            targetEmail = targetEmail, targetName = targetName.normalizedAuditName(),
            detail = buildUserFeatureAccessDetail(targetName, targetEmail, afterState),
            beforeState = objectMapper.writeValueAsString(beforeState),
            afterState = objectMapper.writeValueAsString(afterState),
        )
    }

    fun recordViewerAllowlistAdded(
        actorEmail: String, actorName: String?, targetEmail: String, targetName: String?,
        beforeState: ViewerAllowlistAuditSnapshot, afterState: ViewerAllowlistAuditSnapshot,
    ) {
        if (beforeState == afterState) return
        saveAuditLog(
            category = AuditLogCategory.PERMISSION, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.VIEWER_ALLOWLIST_ADDED,
            targetEmail = targetEmail, targetName = targetName.normalizedAuditName(),
            detail = "${targetName.normalizedAuditName() ?: targetEmail} 전사 열람자 추가",
            beforeState = objectMapper.writeValueAsString(beforeState),
            afterState = objectMapper.writeValueAsString(afterState),
        )
    }

    fun recordViewerAllowlistRemoved(
        actorEmail: String, actorName: String?, targetEmail: String, targetName: String?,
        beforeState: ViewerAllowlistAuditSnapshot, afterState: ViewerAllowlistAuditSnapshot,
    ) {
        if (beforeState == afterState) return
        saveAuditLog(
            category = AuditLogCategory.PERMISSION, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.VIEWER_ALLOWLIST_REMOVED,
            targetEmail = targetEmail, targetName = targetName.normalizedAuditName(),
            detail = "${targetName.normalizedAuditName() ?: targetEmail} 전사 열람자 제거",
            beforeState = objectMapper.writeValueAsString(beforeState),
            afterState = objectMapper.writeValueAsString(afterState),
        )
    }

    fun recordAssetRetentionPolicyUpdated(
        actorEmail: String, actorName: String?,
        beforeState: AssetRetentionPolicyAuditSnapshot, afterState: AssetRetentionPolicyAuditSnapshot,
    ) {
        if (beforeState == afterState) return
        saveAuditLog(
            category = AuditLogCategory.POLICY, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.ASSET_RETENTION_POLICY_UPDATED,
            targetEmail = actorEmail, targetName = "자산 보관 정책",
            detail = "휴지통 보관 정책이 변경되었습니다.",
            beforeState = objectMapper.writeValueAsString(beforeState),
            afterState = objectMapper.writeValueAsString(afterState),
        )
    }

    fun recordAssetAccessDenied(actorEmail: String, actorName: String?, asset: AssetEntity, attemptedAction: AssetAccessAction) {
        saveAuditLog(
            category = AuditLogCategory.PERMISSION, outcome = AuditLogOutcome.WARNING,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.ASSET_ACCESS_DENIED,
            targetEmail = asset.ownerEmail, targetName = asset.title,
            detail = "${asset.title} 자산에 대한 ${attemptedAction.toKoreanLabel()} 요청이 차단되었습니다.",
            beforeState = objectMapper.writeValueAsString(AssetAccessScopeAuditSnapshot.from(asset)),
            afterState = null,
        )
    }

    fun recordAssetAccessScopeUpdated(
        actorEmail: String, actorName: String?, asset: AssetEntity,
        beforeState: AssetAccessScopeAuditSnapshot, afterState: AssetAccessScopeAuditSnapshot,
    ) {
        if (beforeState == afterState) return
        saveAuditLog(
            category = AuditLogCategory.PERMISSION, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.ASSET_ACCESS_SCOPE_UPDATED,
            targetEmail = asset.ownerEmail, targetName = asset.title,
            detail = "${asset.title} 자산의 열람 조직이 변경되었습니다.",
            beforeState = objectMapper.writeValueAsString(beforeState),
            afterState = objectMapper.writeValueAsString(afterState),
        )
    }

    fun recordAssetExported(actorEmail: String, actorName: String?, exportedAssetCount: Int) {
        saveAuditLog(
            category = AuditLogCategory.PERMISSION, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.ASSET_EXPORTED,
            targetEmail = actorEmail, targetName = "자산 일괄 내보내기",
            detail = "${exportedAssetCount}개 자산이 ZIP으로 내보내기 되었습니다.",
            beforeState = null, afterState = null,
        )
    }

    fun recordAssetRestored(
        actorEmail: String, actorName: String?, asset: AssetEntity,
        beforeState: AssetLifecycleAuditSnapshot, afterState: AssetLifecycleAuditSnapshot,
    ) {
        saveAuditLog(
            category = AuditLogCategory.POLICY, outcome = AuditLogOutcome.SUCCESS,
            actorEmail = actorEmail, actorName = actorName.normalizedAuditName(),
            actionType = AdminAuditLogAction.ASSET_RESTORED,
            targetEmail = asset.ownerEmail, targetName = asset.title,
            detail = "${asset.title} 자산이 복구되었습니다.",
            beforeState = objectMapper.writeValueAsString(beforeState),
            afterState = objectMapper.writeValueAsString(afterState),
        )
    }

    fun listRecentLogs(): List<AuditLogResponse> = adminAuditLogRepository.findTop50ByOrderByCreatedAtDescIdDesc()
        .map { entity ->
            AuditLogResponse(
                id = requireNotNull(entity.id), category = entity.category.name,
                outcome = entity.outcome.name, actorName = entity.actorName,
                actorEmail = entity.actorEmail, actionType = entity.actionType.name,
                targetName = entity.targetName, targetEmail = entity.targetEmail,
                detail = entity.detail, beforeState = entity.beforeState,
                afterState = entity.afterState, createdAt = entity.createdAt,
            )
        }

    private fun saveAuditLog(
        category: AuditLogCategory, outcome: AuditLogOutcome, actorEmail: String,
        actorName: String?, actionType: AdminAuditLogAction, targetEmail: String,
        targetName: String?, detail: String?, beforeState: String?, afterState: String?,
    ) {
        adminAuditLogRepository.save(
            AdminAuditLogEntity(
                category = category, outcome = outcome, actorEmail = actorEmail,
                actorName = actorName, actionType = actionType, targetEmail = targetEmail,
                targetName = targetName, detail = detail, beforeState = beforeState, afterState = afterState,
            ),
        )
    }

    private fun buildUserAssignmentDetail(beforeProfile: AuthUserProfile, afterProfile: AuthUserProfile): String {
        val beforeOrg = beforeProfile.organizationName ?: "미지정"
        val afterOrg = afterProfile.organizationName ?: "미지정"
        return "${afterProfile.displayName}: $beforeOrg -> $afterOrg"
    }

    private fun buildUserRolePromotionDetail(beforeProfile: AuthUserProfile, afterProfile: AuthUserProfile): String =
        "${afterProfile.displayName}: ${beforeProfile.role.name} -> ${afterProfile.role.name}"

    private fun buildUserFeatureAccessDetail(targetName: String?, targetEmail: String, snapshot: UserFeatureAccessAuditSnapshot): String =
        "${targetName.normalizedAuditName() ?: targetEmail} 기능 권한 변경 · Allow ${snapshot.allowedFeatureKeys.size}개 / Deny ${snapshot.deniedFeatureKeys.size}개"
}

private fun String?.normalizedAuditName(): String? = this?.trim()?.takeIf { it.isNotEmpty() }

private fun AssetAccessAction.toKoreanLabel(): String = when (this) {
    AssetAccessAction.DETAIL_VIEW -> "상세 조회"
    AssetAccessAction.DOWNLOAD -> "다운로드"
    AssetAccessAction.UPDATE -> "수정"
    AssetAccessAction.DELETE -> "삭제"
}
