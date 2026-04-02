package com.acts.asset.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "asset_files")
class AssetFileEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    var asset: AssetEntity,
    @Column(name = "version_number", nullable = false)
    var versionNumber: Int,
    @Column(name = "bucket_name", nullable = false)
    var bucketName: String,
    @Column(name = "object_key", nullable = false)
    var objectKey: String,
    @Column(name = "original_file_name", nullable = false)
    var originalFileName: String,
    @Column(name = "mime_type", nullable = false)
    var mimeType: String,
    @Column(name = "file_size_bytes", nullable = false)
    var fileSizeBytes: Long,
    @Column(name = "checksum_sha256")
    var checksumSha256: String?,
    @Column(name = "created_by_email", nullable = false)
    var createdByEmail: String,
    @Column(name = "created_by_name", nullable = false)
    var createdByName: String,
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        createdAt = Instant.now()
    }
}
