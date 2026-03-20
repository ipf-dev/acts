package com.acts.auth.audit

import java.time.Instant

data class AuditLogResponse(
    val id: Long,
    val category: String,
    val outcome: String,
    val actorName: String?,
    val actorEmail: String,
    val actionType: String,
    val targetName: String?,
    val targetEmail: String,
    val detail: String?,
    val beforeState: String?,
    val afterState: String?,
    val createdAt: Instant,
)
