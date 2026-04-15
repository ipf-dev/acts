package com.acts.hub

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface HubEpisodeSlotRepository : JpaRepository<HubEpisodeSlotEntity, Long> {
    fun existsByEpisode_IdAndNameIgnoreCase(episodeId: Long, name: String): Boolean

    fun findAllByEpisode_IdOrderBySortOrderAscIdAsc(episodeId: Long): List<HubEpisodeSlotEntity>

    fun findByIdAndEpisode_Id(slotId: Long, episodeId: Long): HubEpisodeSlotEntity?

    @Query(
        """
        select max(slot.sortOrder)
        from HubEpisodeSlotEntity slot
        where slot.episode.id = :episodeId
        """,
    )
    fun findMaxSortOrderByEpisodeId(episodeId: Long): Int?
}
