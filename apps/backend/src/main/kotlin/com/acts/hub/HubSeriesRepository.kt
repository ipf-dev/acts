package com.acts.hub

import org.springframework.data.jpa.repository.JpaRepository

interface HubSeriesRepository : JpaRepository<HubSeriesEntity, Long> {
    fun existsByNameIgnoreCase(name: String): Boolean
    fun existsBySlug(slug: String): Boolean
    fun findAllByOrderByNameAsc(): List<HubSeriesEntity>
    fun findBySlug(slug: String): HubSeriesEntity?
}
