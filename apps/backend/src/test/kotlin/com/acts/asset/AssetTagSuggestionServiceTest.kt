package com.acts.asset

import com.acts.asset.tag.AssetTagSuggestionService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AssetTagSuggestionServiceTest {
    private val assetTagSuggestionService = AssetTagSuggestionService()

    @Test
    fun `adds asset type label and filename tokens without duplicating manual tags`() {
        val tags = assetTagSuggestionService.buildTags(
            fileName = "coco_adventure_ep3_background.png",
            title = "코코 모험 배경",
            assetType = AssetType.IMAGE,
            requestedTags = listOf("코코", "배경", "코코"),
        )

        assertThat(tags.map { tag -> tag.value })
            .contains("코코", "배경", "이미지", "coco", "adventure", "ep3", "background")
        assertThat(tags.count { tag -> tag.normalizedValue == "코코" }).isEqualTo(1)
    }
}
