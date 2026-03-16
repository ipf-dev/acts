package com.acts.auth

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "admin_audit_logs")
class AdminAuditLogEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    @Column(name = "actor_email", nullable = false)
    var actorEmail: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    var actionType: AdminAuditLogAction,
    @Column(name = "target_email", nullable = false)
    var targetEmail: String,
    @Column(name = "before_state")
    var beforeState: String? = null,
    @Column(name = "after_state")
    var afterState: String? = null,
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        createdAt = Instant.now()
    }
}
