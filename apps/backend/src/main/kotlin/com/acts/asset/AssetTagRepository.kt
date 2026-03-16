package com.acts.asset

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface AssetTagRepository : JpaRepository<AssetTagEntity, Long> {
    @Query(
        """
        select assetTag
        from AssetTagEntity assetTag
        join fetch assetTag.asset asset
        where asset.id in :assetIds
        order by asset.id asc, assetTag.id asc
        """,
    )
    fun findAllByAssetIds(@Param("assetIds") assetIds: Collection<Long>): List<AssetTagEntity>
}
