package com.acts.project

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectAssetRepository : JpaRepository<ProjectAssetEntity, Long> {
    @EntityGraph(attributePaths = ["asset", "asset.organization"])
    fun findAllByProject_IdOrderByCreatedAtAscIdAsc(projectId: Long): List<ProjectAssetEntity>

    fun existsByProject_IdAndAsset_Id(projectId: Long, assetId: Long): Boolean

    fun findByProject_IdAndAsset_Id(projectId: Long, assetId: Long): ProjectAssetEntity?
}
