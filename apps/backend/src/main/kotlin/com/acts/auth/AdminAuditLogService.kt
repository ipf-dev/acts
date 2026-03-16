package com.acts.auth

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service

@Service
class AdminAuditLogService(
    private val adminAuditLogRepository: AdminAuditLogRepository,
    private val objectMapper: ObjectMapper,
) {
    fun recordUserAssignmentChange(
        actorEmail: String,
        beforeProfile: AuthUserProfile,
        afterProfile: AuthUserProfile,
    ) {
        if (beforeProfile == afterProfile) {
            return
        }

        saveAuditLog(
            actorEmail = actorEmail,
            actionType = AdminAuditLogAction.USER_ASSIGNMENT_UPDATED,
            targetEmail = afterProfile.email,
            beforeState = objectMapper.writeValueAsString(UserAssignmentAuditSnapshot.from(beforeProfile)),
            afterState = objectMapper.writeValueAsString(UserAssignmentAuditSnapshot.from(afterProfile)),
        )
    }

    fun recordViewerAllowlistAdded(
        actorEmail: String,
        targetEmail: String,
        beforeState: ViewerAllowlistAuditSnapshot,
        afterState: ViewerAllowlistAuditSnapshot,
    ) {
        if (beforeState == afterState) {
            return
        }

        saveAuditLog(
            actorEmail = actorEmail,
            actionType = AdminAuditLogAction.VIEWER_ALLOWLIST_ADDED,
            targetEmail = targetEmail,
            beforeState = objectMapper.writeValueAsString(beforeState),
            afterState = objectMapper.writeValueAsString(afterState),
        )
    }

    fun recordViewerAllowlistRemoved(
        actorEmail: String,
        targetEmail: String,
        beforeState: ViewerAllowlistAuditSnapshot,
        afterState: ViewerAllowlistAuditSnapshot,
    ) {
        if (beforeState == afterState) {
            return
        }

        saveAuditLog(
            actorEmail = actorEmail,
            actionType = AdminAuditLogAction.VIEWER_ALLOWLIST_REMOVED,
            targetEmail = targetEmail,
            beforeState = objectMapper.writeValueAsString(beforeState),
            afterState = objectMapper.writeValueAsString(afterState),
        )
    }

    fun listRecentLogs(): List<AuditLogResponse> = adminAuditLogRepository.findTop50ByOrderByCreatedAtDescIdDesc()
        .map { entity ->
            AuditLogResponse(
                id = requireNotNull(entity.id),
                actorEmail = entity.actorEmail,
                actionType = entity.actionType.name,
                targetEmail = entity.targetEmail,
                beforeState = entity.beforeState,
                afterState = entity.afterState,
                createdAt = entity.createdAt,
            )
        }

    private fun saveAuditLog(
        actorEmail: String,
        actionType: AdminAuditLogAction,
        targetEmail: String,
        beforeState: String?,
        afterState: String?,
    ) {
        adminAuditLogRepository.save(
            AdminAuditLogEntity(
                actorEmail = actorEmail,
                actionType = actionType,
                targetEmail = targetEmail,
                beforeState = beforeState,
                afterState = afterState,
            ),
        )
    }
}

private data class UserAssignmentAuditSnapshot(
    val email: String,
    val departmentId: Long?,
    val departmentName: String?,
    val teamId: Long?,
    val teamName: String?,
    val positionTitle: String?,
    val role: String,
    val companyWideViewer: Boolean,
) {
    companion object {
        fun from(profile: AuthUserProfile): UserAssignmentAuditSnapshot = UserAssignmentAuditSnapshot(
            email = profile.email,
            departmentId = profile.departmentId,
            departmentName = profile.departmentName,
            teamId = profile.teamId,
            teamName = profile.teamName,
            positionTitle = profile.positionTitle,
            role = profile.role.name,
            companyWideViewer = profile.companyWideViewer,
        )
    }
}

data class ViewerAllowlistAuditSnapshot(
    val email: String,
    val allowlisted: Boolean,
    val effectiveCompanyWideViewer: Boolean,
)
