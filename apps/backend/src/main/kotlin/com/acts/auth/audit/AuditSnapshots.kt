package com.acts.auth.audit

import com.acts.auth.api.AuthUserProfile

data class ViewerAllowlistAuditSnapshot(
    val email: String,
    val allowlisted: Boolean,
    val effectiveCompanyWideViewer: Boolean,
)

data class UserFeatureAccessAuditSnapshot(
    val email: String,
    val role: String,
    val allowedFeatureKeys: List<String>,
    val deniedFeatureKeys: List<String>,
)

internal data class UserAssignmentAuditSnapshot(
    val email: String,
    val organizationId: Long?,
    val organizationName: String?,
    val role: String,
    val companyWideViewer: Boolean,
) {
    companion object {
        fun from(profile: AuthUserProfile): UserAssignmentAuditSnapshot = UserAssignmentAuditSnapshot(
            email = profile.email,
            organizationId = profile.organizationId,
            organizationName = profile.organizationName,
            role = profile.role.name,
            companyWideViewer = profile.companyWideViewer,
        )
    }
}
