package com.acts.asset.repository

import com.acts.asset.domain.AssetEntity
import org.springframework.data.jpa.repository.JpaRepository

interface AssetRepository : JpaRepository<AssetEntity, Long>, AssetRepositoryCustom {
    fun findAllByDeletedAtIsNullOrderByCreatedAtDescIdDesc(): List<AssetEntity>

    fun findAllByDeletedAtIsNotNullOrderByDeletedAtDescIdDesc(): List<AssetEntity>

    fun findByIdAndDeletedAtIsNull(id: Long): AssetEntity?
}
