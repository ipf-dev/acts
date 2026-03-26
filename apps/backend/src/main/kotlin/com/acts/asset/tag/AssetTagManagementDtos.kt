package com.acts.asset.tag

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class CharacterTagOptionResponse(
    val id: Long,
    val name: String,
    val aliases: List<String>,
)

data class AssetTagValueOptionResponse(
    val value: String,
    val usageCount: Long,
)

data class AssetTagOptionCatalogResponse(
    val locations: List<AssetTagValueOptionResponse>,
    val keywords: List<AssetTagValueOptionResponse>,
)

data class AdminCharacterTagResponse(
    val id: Long,
    val name: String,
    val aliases: List<String>,
    val usageCount: Long,
)

data class AdminAssetTagValueResponse(
    val type: AssetTagType,
    val value: String,
    val usageCount: Long,
)

data class AdminAssetTagCatalogResponse(
    val characters: List<AdminCharacterTagResponse>,
    val locations: List<AdminAssetTagValueResponse>,
    val keywords: List<AdminAssetTagValueResponse>,
)

data class CharacterTagUpsertRequest @JsonCreator constructor(
    @JsonProperty("name")
    val name: String = "",
    @JsonProperty("aliases")
    val aliases: List<String> = emptyList(),
)

data class AssetTagRenameRequest @JsonCreator constructor(
    @JsonProperty("tagType")
    val tagType: AssetTagType = AssetTagType.KEYWORD,
    @JsonProperty("currentValue")
    val currentValue: String = "",
    @JsonProperty("nextValue")
    val nextValue: String = "",
)

data class AssetTagMergeRequest @JsonCreator constructor(
    @JsonProperty("tagType")
    val tagType: AssetTagType = AssetTagType.KEYWORD,
    @JsonProperty("sourceValue")
    val sourceValue: String = "",
    @JsonProperty("targetValue")
    val targetValue: String = "",
)
