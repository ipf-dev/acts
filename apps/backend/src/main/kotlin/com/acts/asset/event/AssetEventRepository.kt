package com.acts.asset.event

import org.springframework.data.jpa.repository.JpaRepository

interface AssetEventRepository : JpaRepository<AssetEventEntity, Long> {
    fun existsByAsset_IdAndEventType(assetId: Long, eventType: AssetEventType): Boolean

    fun findAllByAsset_IdOrderByCreatedAtDescIdDesc(assetId: Long): List<AssetEventEntity>
}
