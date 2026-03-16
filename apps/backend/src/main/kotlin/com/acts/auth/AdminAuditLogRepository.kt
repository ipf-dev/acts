package com.acts.auth

import org.springframework.data.jpa.repository.JpaRepository

interface AdminAuditLogRepository : JpaRepository<AdminAuditLogEntity, Long> {
    fun findTop50ByOrderByCreatedAtDescIdDesc(): List<AdminAuditLogEntity>
}
