package com.acts.asset.domain

import com.acts.auth.audit.AdminAuditLogService
import com.acts.auth.feature.AppFeatureKey
import com.acts.auth.user.UserAccountEntity
import com.acts.auth.feature.UserFeatureAccessService
import com.acts.auth.domain.UserRole
import org.springframework.stereotype.Service

@Service
class AssetAuthorizationService(
    private val adminAuditLogService: AdminAuditLogService,
    private val userFeatureAccessService: UserFeatureAccessService,
) {
    fun filterVisibleAssets(
        actor: UserAccountEntity,
        assets: List<AssetEntity>,
    ): List<AssetEntity> {
        requireLibraryAccess(actor)
        return assets
    }

    fun permissionsFor(
        actor: UserAccountEntity,
        asset: AssetEntity,
    ): AssetPermissionSnapshot = AssetPermissionSnapshot(
        canEdit = canEdit(actor, asset),
        canDelete = canDelete(actor, asset),
        canDownload = asset.sourceKind == AssetSourceKind.FILE,
    )

    fun requireViewAccess(
        actor: UserAccountEntity,
        asset: AssetEntity,
        action: AssetAccessAction,
    ) {
        requireLibraryAccess(actor)
        return
    }

    fun requireEditAccess(actor: UserAccountEntity, asset: AssetEntity) {
        requireLibraryAccess(actor)
        if (canEdit(actor, asset)) {
            return
        }

        adminAuditLogService.recordAssetAccessDenied(
            actorEmail = actor.email,
            actorName = actor.displayName,
            asset = asset,
            attemptedAction = AssetAccessAction.UPDATE,
        )
        throw SecurityException("자산 편집 권한이 없습니다.")
    }

    fun requireDeleteAccess(actor: UserAccountEntity, asset: AssetEntity) {
        requireLibraryAccess(actor)
        if (canDelete(actor, asset)) {
            return
        }

        adminAuditLogService.recordAssetAccessDenied(
            actorEmail = actor.email,
            actorName = actor.displayName,
            asset = asset,
            attemptedAction = AssetAccessAction.DELETE,
        )
        throw SecurityException("자산 삭제 권한이 없습니다.")
    }

    fun requireExportAllAccess(actor: UserAccountEntity) {
        requireLibraryAccess(actor)
        if (canExportAll(actor)) {
            return
        }

        throw SecurityException("자산 내보내기 권한이 없습니다.")
    }

    fun canExportAll(actor: UserAccountEntity): Boolean = actor.role == UserRole.ADMIN || actor.companyWideViewer

    fun requireLibraryAccess(actor: UserAccountEntity) {
        if (userFeatureAccessService.isFeatureAllowed(actor.email, actor.role, AppFeatureKey.ASSET_LIBRARY)) {
            return
        }

        throw SecurityException("자산 라이브러리 기능 권한이 없습니다.")
    }

    private fun canEdit(actor: UserAccountEntity, asset: AssetEntity): Boolean =
        actor.role == UserRole.ADMIN || asset.ownerEmail.equals(actor.email, ignoreCase = true)

    private fun canDelete(actor: UserAccountEntity, asset: AssetEntity): Boolean =
        actor.role == UserRole.ADMIN || asset.ownerEmail.equals(actor.email, ignoreCase = true)
}

data class AssetPermissionSnapshot(
    val canEdit: Boolean,
    val canDelete: Boolean,
    val canDownload: Boolean,
)

enum class AssetAccessAction {
    DETAIL_VIEW,
    DOWNLOAD,
    UPDATE,
    DELETE,
}
