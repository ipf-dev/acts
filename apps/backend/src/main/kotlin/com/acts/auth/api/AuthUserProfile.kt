package com.acts.auth.api

import com.acts.auth.domain.UserRole
import com.acts.auth.user.UserMappingMode
import java.time.Instant

data class AuthUserProfile(
    val email: String,
    val displayName: String,
    val organizationId: Long?,
    val organizationName: String?,
    val mappingMode: UserMappingMode,
    val role: UserRole,
    val companyWideViewer: Boolean,
    val manualAssignmentRequired: Boolean,
    val deactivatedAt: Instant? = null,
)
