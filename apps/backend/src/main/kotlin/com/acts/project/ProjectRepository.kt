package com.acts.project

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectRepository : JpaRepository<ProjectEntity, Long> {
    fun existsBySlug(slug: String): Boolean

    @EntityGraph(attributePaths = ["organization", "createdBy"])
    fun findBySlug(slug: String): ProjectEntity?

    @EntityGraph(attributePaths = ["organization"])
    fun findAllByOrderByCreatedAtDesc(): List<ProjectEntity>
}
