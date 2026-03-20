package com.acts.asset.tag

import com.acts.asset.AssetType
import org.springframework.stereotype.Component
import java.util.LinkedHashMap

@Component
class AssetTagSuggestionService {
    fun buildTags(
        fileName: String,
        title: String,
        assetType: AssetType,
        requestedTags: List<String>,
    ): List<AssetTagCandidate> {
        val tagsByNormalizedValue = LinkedHashMap<String, AssetTagCandidate>()

        requestedTags.mapNotNull { manualTag ->
            normalizeTag(manualTag)?.let { normalizedValue ->
                AssetTagCandidate(
                    value = manualTag.trim(),
                    normalizedValue = normalizedValue,
                    source = AssetTagSource.MANUAL,
                )
            }
        }.forEach { candidate ->
            tagsByNormalizedValue.putIfAbsent(candidate.normalizedValue, candidate)
        }

        val autoCandidates = sequenceOf(
            assetType.labelTag(),
            *extractKeywordTokens(fileName.removeFileExtension()).toList().toTypedArray(),
            *extractKeywordTokens(title).toList().toTypedArray(),
        ).mapNotNull { autoTag ->
            normalizeTag(autoTag)?.let { normalizedValue ->
                AssetTagCandidate(
                    value = autoTag.trim(),
                    normalizedValue = normalizedValue,
                    source = AssetTagSource.AUTO,
                )
            }
        }

        autoCandidates.forEach { candidate ->
            tagsByNormalizedValue.putIfAbsent(candidate.normalizedValue, candidate)
        }

        return tagsByNormalizedValue.values.toList()
    }

    private fun extractKeywordTokens(value: String): Sequence<String> = value
        .split(Regex("[^\\p{L}\\p{N}]+"))
        .asSequence()
        .map { token -> token.trim() }
        .filter { token -> token.length >= 2 }
        .filterNot { token ->
            token.lowercase() in setOf("final", "edit", "file", "asset", "ver", "version", "jpeg", "jpg", "png", "gif", "webp", "mp4", "mov", "mp3", "wav", "pdf", "zip")
        }
        .take(4)

    private fun normalizeTag(value: String): String? = value.trim()
        .lowercase()
        .replace(Regex("\\s+"), " ")
        .takeIf { normalizedValue -> normalizedValue.isNotBlank() }
        ?.take(80)

    private fun String.removeFileExtension(): String = substringBeforeLast(".", this)

    private fun AssetType.labelTag(): String = when (this) {
        AssetType.IMAGE -> "이미지"
        AssetType.VIDEO -> "영상"
        AssetType.AUDIO -> "오디오"
        AssetType.DOCUMENT -> "문서"
        AssetType.SCENARIO -> "시나리오"
        AssetType.OTHER -> "기타"
    }
}

data class AssetTagCandidate(
    val value: String,
    val normalizedValue: String,
    val source: AssetTagSource,
)
