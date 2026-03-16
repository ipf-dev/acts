package com.acts.auth

data class AuthUserProfile(
    val email: String,
    val displayName: String,
    val departmentId: Long?,
    val departmentName: String?,
    val positionTitle: String?,
    val mappingMode: UserMappingMode,
    val role: UserRole,
    val companyWideViewer: Boolean,
    val manualAssignmentRequired: Boolean,
)
