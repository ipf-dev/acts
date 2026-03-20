package com.acts.asset.event

import org.springframework.data.jpa.repository.JpaRepository

interface AssetEventRepository : JpaRepository<AssetEventEntity, Long> {
    fun findAllByAsset_IdOrderByCreatedAtDescIdDesc(assetId: Long): List<AssetEventEntity>
}
