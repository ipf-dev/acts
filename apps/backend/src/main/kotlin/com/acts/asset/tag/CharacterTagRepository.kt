package com.acts.asset.tag

import org.springframework.data.jpa.repository.JpaRepository

interface CharacterTagRepository : JpaRepository<CharacterTagEntity, Long> {
    fun existsByNormalizedName(normalizedName: String): Boolean

    fun findAllByOrderByNameAsc(): List<CharacterTagEntity>

    fun findByNormalizedName(normalizedName: String): CharacterTagEntity?
}
