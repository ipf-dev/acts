package com.acts.asset

import com.acts.auth.org.OrganizationEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "assets")
class AssetEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    @Column(nullable = false)
    var title: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false)
    var assetType: AssetType,
    @Enumerated(EnumType.STRING)
    @Column(name = "asset_status", nullable = false)
    var assetStatus: AssetStatus,
    @Column(columnDefinition = "text")
    var description: String? = null,
    @Column(name = "original_file_name", nullable = false)
    var originalFileName: String,
    @Column(name = "mime_type", nullable = false)
    var mimeType: String,
    @Column(name = "file_size_bytes", nullable = false)
    var fileSizeBytes: Long,
    @Column(name = "file_extension")
    var fileExtension: String? = null,
    @Column(name = "owner_email", nullable = false)
    var ownerEmail: String,
    @Column(name = "owner_name", nullable = false)
    var ownerName: String,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    var organization: OrganizationEntity? = null,
    @Column(name = "current_version_number", nullable = false)
    var currentVersionNumber: Int,
    @Column(name = "search_text", nullable = false, columnDefinition = "text")
    var searchText: String,
    @Column(name = "width_px")
    var widthPx: Int? = null,
    @Column(name = "height_px")
    var heightPx: Int? = null,
    @Column(name = "duration_ms")
    var durationMs: Long? = null,
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
    @Column(name = "deleted_at")
    var deletedAt: Instant? = null,
    @Column(name = "deleted_by_email")
    var deletedByEmail: String? = null,
    @Column(name = "deleted_by_name")
    var deletedByName: String? = null,
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
