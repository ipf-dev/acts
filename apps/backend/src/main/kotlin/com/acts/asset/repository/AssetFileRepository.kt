package com.acts.asset.repository

import com.acts.asset.domain.AssetFileEntity
import org.springframework.data.jpa.repository.JpaRepository

interface AssetFileRepository : JpaRepository<AssetFileEntity, Long> {
    fun findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId: Long): AssetFileEntity?

    fun findAllByAsset_IdInOrderByAsset_IdAscVersionNumberDescIdDesc(assetIds: Collection<Long>): List<AssetFileEntity>
}
