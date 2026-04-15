package com.acts.hub

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface HubLevelRepository : JpaRepository<HubLevelEntity, Long> {
    fun existsBySeries_IdAndSortOrder(seriesId: Long, sortOrder: Int): Boolean

    @EntityGraph(attributePaths = ["series"])
    fun findBySlug(slug: String): HubLevelEntity?

    @Query(
        """
        select level
        from HubLevelEntity level
        join fetch level.series series
        order by series.name asc, level.sortOrder asc, level.name asc
        """,
    )
    fun findAllForNavigation(): List<HubLevelEntity>
}
