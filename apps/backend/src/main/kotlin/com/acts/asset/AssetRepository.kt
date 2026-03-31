package com.acts.asset

import org.springframework.data.jpa.repository.JpaRepository

interface AssetRepository : JpaRepository<AssetEntity, Long>, AssetRepositoryCustom {
    fun findAllByDeletedAtIsNullOrderByCreatedAtDescIdDesc(): List<AssetEntity>

    fun findAllByDeletedAtIsNotNullOrderByDeletedAtDescIdDesc(): List<AssetEntity>

    fun findByIdAndDeletedAtIsNull(id: Long): AssetEntity?
}
