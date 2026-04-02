package com.acts.asset

import com.acts.asset.api.AssetStructuredTagsRequest
import com.acts.asset.tag.AssetTagSuggestionService
import com.acts.asset.tag.AssetTagType
import com.acts.asset.tag.CharacterTagEntity
import com.acts.asset.tag.CharacterTagRepository
import com.acts.support.TEST_ADMIN_EMAIL
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class AssetTagSuggestionServiceTest {
    private val characterTagRepository = mock<CharacterTagRepository>()
    private val assetTagSuggestionService = AssetTagSuggestionService(characterTagRepository)

    @Test
    fun `resolves structured tags without duplicating same type and value`() {
        whenever(characterTagRepository.findAllById(listOf(1L))).thenReturn(
            listOf(
                CharacterTagEntity(
                    id = 1L,
                    name = "코코",
                    normalizedName = "코코",
                    createdByEmail = TEST_ADMIN_EMAIL,
                    updatedByEmail = TEST_ADMIN_EMAIL,
                ),
            ),
        )

        val tags = assetTagSuggestionService.buildTags(
            requestedTags = AssetStructuredTagsRequest(
                characterTagIds = listOf(1L, 1L),
                locations = listOf("서울", "서울"),
                keywords = listOf("축제", "축제"),
            ),
        )

        assertThat(tags).extracting("value").containsExactly("코코", "서울", "축제")
        assertThat(tags).extracting("tagType").containsExactly(
            AssetTagType.CHARACTER,
            AssetTagType.LOCATION,
            AssetTagType.KEYWORD,
        )
    }
}
