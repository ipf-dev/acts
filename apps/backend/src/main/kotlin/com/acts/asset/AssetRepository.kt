package com.acts.asset

import org.springframework.data.jpa.repository.JpaRepository

interface AssetRepository : JpaRepository<AssetEntity, Long> {
    fun findAllByOrderByCreatedAtDescIdDesc(): List<AssetEntity>
}
