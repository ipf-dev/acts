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
@Table(name = "audit_logs")
class AdminAuditLogEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var category: AuditLogCategory,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var outcome: AuditLogOutcome,
    @Column(name = "actor_email", nullable = false)
    var actorEmail: String,
    @Column(name = "actor_name")
    var actorName: String? = null,
    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    var actionType: AdminAuditLogAction,
    @Column(name = "target_email", nullable = false)
    var targetEmail: String,
    @Column(name = "target_name")
    var targetName: String? = null,
    @Column(name = "detail")
    var detail: String? = null,
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
