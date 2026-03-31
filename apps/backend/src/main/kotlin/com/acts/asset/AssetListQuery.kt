package com.acts.asset

import java.text.Normalizer

data class AssetListQuery(
    val search: String? = null,
    val assetType: AssetType? = null,
    val organizationId: Long? = null,
    val creatorEmail: String? = null,
    val imageArtStyle: AssetImageArtStyle? = null,
    val imageHasLayerFile: Boolean? = null,
    val audioTtsVoice: String? = null,
    val audioRecordingType: AssetAudioRecordingType? = null,
    val videoStage: AssetVideoStage? = null,
    val documentKind: AssetDocumentKind? = null,
) {
    fun normalizedSearchTerms(): List<String> = search
        ?.let(::normalizeAssetQueryText)
        ?.trim()
        ?.lowercase()
        ?.split(Regex("\\s+"))
        ?.filter { searchTerm -> searchTerm.isNotBlank() }
        .orEmpty()

    fun normalizedCreatorEmail(): String? = creatorEmail
        ?.let(::normalizeAssetQueryText)
        ?.trim()
        ?.lowercase()
        ?.takeIf { value -> value.isNotEmpty() }

    fun normalizedAudioTtsVoice(): String? = audioTtsVoice
        ?.let(::normalizeAssetQueryText)
        ?.trim()
        ?.lowercase()
        ?.takeIf { value -> value.isNotEmpty() }
}

private fun normalizeAssetQueryText(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFC)
