package com.acts.auth

import com.acts.auth.user.UserMappingMode

data class AuthUserProfile(
    val email: String,
    val displayName: String,
    val organizationId: Long?,
    val organizationName: String?,
    val mappingMode: UserMappingMode,
    val role: UserRole,
    val companyWideViewer: Boolean,
    val manualAssignmentRequired: Boolean,
)
