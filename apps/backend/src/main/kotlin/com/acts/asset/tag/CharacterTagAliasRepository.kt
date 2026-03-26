package com.acts.asset.tag

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface CharacterTagAliasRepository : JpaRepository<CharacterTagAliasEntity, Long> {
    fun existsByNormalizedValue(normalizedValue: String): Boolean

    fun findAllByCharacterTag_IdOrderByIdAsc(characterTagId: Long): List<CharacterTagAliasEntity>

    @Query(
        """
        select alias
        from CharacterTagAliasEntity alias
        join fetch alias.characterTag characterTag
        where alias.normalizedValue = :normalizedValue
        """,
    )
    fun findWithCharacterByNormalizedValue(
        @Param("normalizedValue") normalizedValue: String,
    ): CharacterTagAliasEntity?

    @Query(
        """
        select alias
        from CharacterTagAliasEntity alias
        join fetch alias.characterTag characterTag
        where characterTag.normalizedName in :normalizedNames
        order by characterTag.normalizedName asc, alias.id asc
        """,
    )
    fun findAllWithCharacterByNormalizedNames(
        @Param("normalizedNames") normalizedNames: Collection<String>,
    ): List<CharacterTagAliasEntity>

    @Query(
        """
        select alias
        from CharacterTagAliasEntity alias
        join fetch alias.characterTag characterTag
        order by alias.normalizedValue asc, alias.id asc
        """,
    )
    fun findAllWithCharacterOrderByNormalizedValueAsc(): List<CharacterTagAliasEntity>
}
