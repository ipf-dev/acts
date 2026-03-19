package com.acts.asset

import com.acts.auth.AdminAuditLogService
import com.acts.auth.UserAccountEntity
import com.acts.auth.UserRole
import org.springframework.stereotype.Service

@Service
class AssetAuthorizationService(
    private val adminAuditLogService: AdminAuditLogService,
) {
    fun filterVisibleAssets(
        actor: UserAccountEntity,
        assets: List<AssetEntity>,
    ): List<AssetEntity> = assets.filter { asset -> canView(actor, asset) }

    fun permissionsFor(
        actor: UserAccountEntity,
        asset: AssetEntity,
    ): AssetPermissionSnapshot = AssetPermissionSnapshot(
        canEdit = canEdit(actor, asset),
        canDelete = canDelete(actor, asset),
        canDownload = canView(actor, asset),
    )

    fun requireViewAccess(
        actor: UserAccountEntity,
        asset: AssetEntity,
        action: AssetAccessAction,
    ) {
        if (canView(actor, asset)) {
            return
        }

        adminAuditLogService.recordAssetAccessDenied(
            actorEmail = actor.email,
            actorName = actor.displayName,
            asset = asset,
            attemptedAction = action,
        )
        throw SecurityException("자산 열람 권한이 없습니다.")
    }

    fun requireEditAccess(actor: UserAccountEntity, asset: AssetEntity) {
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
        if (canExportAll(actor)) {
            return
        }

        throw SecurityException("자산 내보내기 권한이 없습니다.")
    }

    fun canExportAll(actor: UserAccountEntity): Boolean = actor.role == UserRole.ADMIN || actor.companyWideViewer

    private fun canView(actor: UserAccountEntity, asset: AssetEntity): Boolean {
        if (actor.role == UserRole.ADMIN || actor.companyWideViewer) {
            return true
        }

        if (asset.ownerEmail.equals(actor.email, ignoreCase = true)) {
            return true
        }

        val actorOrganizationId = actor.organization?.id
        val assetOrganizationId = asset.organization?.id

        return actorOrganizationId != null && actorOrganizationId == assetOrganizationId
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
