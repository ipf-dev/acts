package com.acts.asset.api

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

enum class AssetImageArtStyle {
    BACKGROUND,
    CHARACTER_SHEET,
    DRAFT,
    OTHER,
}

enum class AssetAudioRecordingType {
    VOICE_OVER,
    CHANT,
    MUSIC,
}

enum class AssetVideoStage {
    SOURCE,
    EDITED,
    FINAL,
}

enum class AssetDocumentKind {
    SCENARIO,
    PLANNING,
    OTHER,
}

data class AssetTypeMetadataRequest @JsonCreator constructor(
    @JsonProperty("imageArtStyle")
    val imageArtStyle: AssetImageArtStyle? = null,
    @JsonProperty("imageHasLayerFile")
    val imageHasLayerFile: Boolean? = null,
    @JsonProperty("audioTtsVoice")
    val audioTtsVoice: String? = null,
    @JsonProperty("audioRecordingType")
    val audioRecordingType: AssetAudioRecordingType? = null,
    @JsonProperty("videoStage")
    val videoStage: AssetVideoStage? = null,
    @JsonProperty("documentKind")
    val documentKind: AssetDocumentKind? = null,
)

data class AssetTypeMetadataResponse(
    val imageArtStyle: AssetImageArtStyle? = null,
    val imageHasLayerFile: Boolean? = null,
    val audioTtsVoice: String? = null,
    val audioRecordingType: AssetAudioRecordingType? = null,
    val videoStage: AssetVideoStage? = null,
    val documentKind: AssetDocumentKind? = null,
)
