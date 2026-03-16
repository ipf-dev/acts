package com.acts.auth

data class ManualAssignmentRequest(
    val departmentId: Long,
    val teamId: Long,
    val positionTitle: String?,
)
