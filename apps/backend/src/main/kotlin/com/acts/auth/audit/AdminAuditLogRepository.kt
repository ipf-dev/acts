package com.acts.auth.audit

import org.springframework.data.jpa.repository.JpaRepository

interface AdminAuditLogRepository : JpaRepository<AdminAuditLogEntity, Long> {
    fun findTop50ByOrderByCreatedAtDescIdDesc(): List<AdminAuditLogEntity>
}
