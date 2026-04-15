package com.acts.hub

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface HubEpisodeRepository : JpaRepository<HubEpisodeEntity, Long> {
    @EntityGraph(attributePaths = ["level", "level.series"])
    fun findBySlug(slug: String): HubEpisodeEntity?
    fun existsByLevel_IdAndCode(levelId: Long, code: String): Boolean

    @Query(
        """
        select max(episode.sortOrder)
        from HubEpisodeEntity episode
        where episode.level.id = :levelId
        """,
    )
    fun findMaxSortOrderByLevelId(levelId: Long): Int?

    @Query(
        """
        select episode
        from HubEpisodeEntity episode
        join fetch episode.level level
        join fetch level.series series
        order by series.name asc, level.sortOrder asc, episode.sortOrder asc
        """,
    )
    fun findAllForNavigation(): List<HubEpisodeEntity>
}
