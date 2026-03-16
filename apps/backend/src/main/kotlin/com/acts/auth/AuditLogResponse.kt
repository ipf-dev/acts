package com.acts.auth

import java.time.Instant

data class AuditLogResponse(
    val id: Long,
    val actorEmail: String,
    val actionType: String,
    val targetEmail: String,
    val beforeState: String?,
    val afterState: String?,
    val createdAt: Instant,
)
