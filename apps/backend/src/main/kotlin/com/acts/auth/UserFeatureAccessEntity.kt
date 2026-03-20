package com.acts.auth

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.Instant

@Entity
@Table(
    name = "user_feature_access",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uq_user_feature_access",
            columnNames = ["user_email", "feature_key"],
        ),
    ],
)
class UserFeatureAccessEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    @Column(name = "user_email", nullable = false)
    var userEmail: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "feature_key", nullable = false)
    var featureKey: AppFeatureKey,
    @Column(nullable = false)
    var allowed: Boolean,
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
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
