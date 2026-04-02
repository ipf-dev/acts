package com.acts.asset.tag

import com.acts.asset.domain.AssetEntity
import org.springframework.stereotype.Component
import java.text.Normalizer

@Component
class AssetSearchTextBuilder(
    private val characterTagAliasRepository: CharacterTagAliasRepository,
) {
    fun buildFromCandidates(
        asset: AssetEntity,
        tags: List<AssetTagCandidate>,
    ): String = buildSearchText(
        asset = asset,
        terms = tags.map { tag -> SearchableTagTerm(tag.value, tag.tagType, tag.normalizedValue) },
    )

    fun build(
        asset: AssetEntity,
        tags: List<AssetTagEntity>,
    ): String = buildSearchText(
        asset = asset,
        terms = tags.map { tag -> SearchableTagTerm(tag.value, tag.tagType, tag.normalizedValue) },
    )

    private fun buildSearchText(
        asset: AssetEntity,
        terms: List<SearchableTagTerm>,
    ): String = buildList {
        add(asset.title)
        add(asset.originalFileName)
        add(asset.ownerName)
        asset.description?.let(::add)
        asset.organization?.name?.let(::add)
        asset.linkType?.let(::add)
        asset.linkUrl?.let(::add)
        addAll(tagSearchTerms(terms))
    }.joinToString(" ") { value -> normalizedSearchValue(value) }

    private fun tagSearchTerms(tags: List<SearchableTagTerm>): List<String> {
        val terms = LinkedHashSet<String>()
        tags.forEach { tag -> terms.add(tag.value) }

        val characterNormalizedNames = tags.asSequence()
            .filter { tag -> tag.tagType == AssetTagType.CHARACTER }
            .map { tag -> tag.normalizedValue }
            .distinct()
            .toList()
        if (characterNormalizedNames.isEmpty()) {
            return terms.toList()
        }

        characterTagAliasRepository.findAllWithCharacterByNormalizedNames(characterNormalizedNames)
            .forEach { alias -> terms.add(alias.value) }

        return terms.toList()
    }

    private fun normalizedSearchValue(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFC)
        .trim()
        .lowercase()
}

private data class SearchableTagTerm(
    val value: String,
    val tagType: AssetTagType,
    val normalizedValue: String,
)
