package com.acts.auth

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "user_accounts")
class UserAccountEntity(
    @Id
    @Column(nullable = false, updatable = false)
    var email: String,
    @Column(name = "display_name", nullable = false)
    var displayName: String,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    var organization: OrganizationEntity? = null,
    @Column(name = "position_title")
    var positionTitle: String? = null,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: UserRole,
    @Enumerated(EnumType.STRING)
    @Column(name = "mapping_mode", nullable = false)
    var mappingMode: UserMappingMode,
    @Column(name = "company_wide_viewer", nullable = false)
    var companyWideViewer: Boolean = false,
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
    @Column(name = "last_login_at")
    var lastLoginAt: Instant? = null,
) {
    @PrePersist
    fun prePersist() {
        val now = Instant.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = Instant.now()
    }
}
