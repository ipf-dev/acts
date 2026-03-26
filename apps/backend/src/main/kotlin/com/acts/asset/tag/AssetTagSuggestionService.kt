package com.acts.asset.tag

import org.springframework.stereotype.Component
import java.util.LinkedHashMap

@Component
class AssetTagSuggestionService(
    private val characterTagRepository: CharacterTagRepository,
) {
    fun buildTags(
        requestedTags: com.acts.asset.AssetStructuredTagsRequest,
    ): List<AssetTagCandidate> {
        val tagsByNormalizedValue = LinkedHashMap<String, AssetTagCandidate>()

        val characterIds = requestedTags.characterTagIds.distinct()
        val charactersById = if (characterIds.isEmpty()) {
            emptyMap()
        } else {
            characterTagRepository.findAllById(characterIds)
                .associateBy { character -> requireNotNull(character.id) }
                .also { characters ->
                    require(characters.size == characterIds.size) { "존재하지 않는 캐릭터 태그가 포함되어 있습니다." }
                }
        }

        characterIds.forEach { characterId ->
            val character = charactersById[characterId]
                ?: throw IllegalArgumentException("존재하지 않는 캐릭터 태그가 포함되어 있습니다.")
            val candidate = AssetTagCandidate(
                value = character.name,
                normalizedValue = character.normalizedName,
                tagType = AssetTagType.CHARACTER,
                source = AssetTagSource.MANUAL,
            )
            tagsByNormalizedValue.putIfAbsent(candidate.key(), candidate)
        }

        requestedTags.locations.mapNotNull { location ->
            normalizeTag(location)?.let { normalizedValue ->
                AssetTagCandidate(
                    value = location.trim(),
                    normalizedValue = normalizedValue,
                    tagType = AssetTagType.LOCATION,
                    source = AssetTagSource.MANUAL,
                )
            }
        }.forEach { candidate ->
            tagsByNormalizedValue.putIfAbsent(candidate.key(), candidate)
        }

        requestedTags.keywords.mapNotNull { keyword ->
            normalizeTag(keyword)?.let { normalizedValue ->
                AssetTagCandidate(
                    value = keyword.trim(),
                    normalizedValue = normalizedValue,
                    tagType = AssetTagType.KEYWORD,
                    source = AssetTagSource.MANUAL,
                )
            }
        }.forEach { candidate ->
            tagsByNormalizedValue.putIfAbsent(candidate.key(), candidate)
        }

        return tagsByNormalizedValue.values.toList()
    }

    private fun normalizeTag(value: String): String? = value.trim()
        .lowercase()
        .replace(Regex("\\s+"), " ")
        .takeIf { normalizedValue -> normalizedValue.isNotBlank() }
        ?.take(80)
}

data class AssetTagCandidate(
    val value: String,
    val normalizedValue: String,
    val tagType: AssetTagType,
    val source: AssetTagSource,
) {
    fun key(): String = "${tagType.name}:$normalizedValue"
}
