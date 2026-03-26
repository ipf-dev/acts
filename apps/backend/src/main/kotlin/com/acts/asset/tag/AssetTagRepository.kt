package com.acts.asset.tag

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface AssetTagRepository : JpaRepository<AssetTagEntity, Long> {
    @Query(
        """
        select new com.acts.asset.tag.AssetTagValueOptionResponse(
            min(assetTag.value),
            count(assetTag.id)
        )
        from AssetTagEntity assetTag
        where assetTag.tagType = :tagType
        group by assetTag.normalizedValue
        order by count(assetTag.id) desc, min(assetTag.value) asc
        """,
    )
    fun findValueOptionsByTagType(@Param("tagType") tagType: AssetTagType): List<AssetTagValueOptionResponse>

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

    fun findAllByAsset_IdOrderByIdAsc(assetId: Long): List<AssetTagEntity>

    @Query(
        """
        select assetTag
        from AssetTagEntity assetTag
        join fetch assetTag.asset asset
        where assetTag.asset.id in :assetIds
          and assetTag.tagType = :tagType
          and assetTag.normalizedValue = :normalizedValue
        order by assetTag.id asc
        """,
    )
    fun findAllByAssetIdsAndTagTypeAndNormalizedValue(
        @Param("assetIds") assetIds: Collection<Long>,
        @Param("tagType") tagType: AssetTagType,
        @Param("normalizedValue") normalizedValue: String,
    ): List<AssetTagEntity>

    @Query(
        """
        select assetTag
        from AssetTagEntity assetTag
        join fetch assetTag.asset asset
        where assetTag.tagType = :tagType
          and assetTag.normalizedValue = :normalizedValue
        order by assetTag.id asc
        """,
    )
    fun findAllByTagTypeAndNormalizedValue(
        @Param("tagType") tagType: AssetTagType,
        @Param("normalizedValue") normalizedValue: String,
    ): List<AssetTagEntity>

    fun deleteAllByAsset_Id(assetId: Long)
}
