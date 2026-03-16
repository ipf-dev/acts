package com.acts.auth

data class AuthUserProfile(
    val email: String,
    val displayName: String,
    val teamName: String,
    val departmentName: String,
    val mappingMode: UserMappingMode,
    val role: UserRole,
    val manualAssignmentRequired: Boolean,
)
