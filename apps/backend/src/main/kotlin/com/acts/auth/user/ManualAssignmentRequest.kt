package com.acts.auth.user

data class ManualAssignmentRequest(
    val organizationId: Long,
    val positionTitle: String?,
)
