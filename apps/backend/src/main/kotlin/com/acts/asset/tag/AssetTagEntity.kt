package com.acts.asset.tag

import com.acts.asset.domain.AssetEntity
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
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "asset_tags")
class AssetTagEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    var asset: AssetEntity,
    @Column(name = "tag_value", nullable = false)
    var value: String,
    @Column(name = "normalized_value", nullable = false)
    var normalizedValue: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "tag_type", nullable = false)
    var tagType: AssetTagType,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var source: AssetTagSource,
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),
) {
    @PrePersist
    fun prePersist() {
        createdAt = Instant.now()
    }
}
