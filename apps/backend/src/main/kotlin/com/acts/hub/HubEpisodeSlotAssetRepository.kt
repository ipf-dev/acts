package com.acts.hub

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository

interface HubEpisodeSlotAssetRepository : JpaRepository<HubEpisodeSlotAssetEntity, Long> {
    @EntityGraph(attributePaths = ["slot", "asset", "asset.organization"])
    fun findAllBySlot_IdInOrderByCreatedAtAscIdAsc(slotIds: Collection<Long>): List<HubEpisodeSlotAssetEntity>

    fun existsBySlot_IdAndAsset_Id(slotId: Long, assetId: Long): Boolean

    @EntityGraph(attributePaths = ["slot", "asset", "asset.organization"])
    fun findBySlot_IdAndAsset_Id(slotId: Long, assetId: Long): HubEpisodeSlotAssetEntity?
}
