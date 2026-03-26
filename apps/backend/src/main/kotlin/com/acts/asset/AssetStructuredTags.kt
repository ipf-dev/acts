package com.acts.asset

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class AssetStructuredTagsRequest @JsonCreator constructor(
    @JsonProperty("characterTagIds")
    val characterTagIds: List<Long> = emptyList(),
    @JsonProperty("locations")
    val locations: List<String> = emptyList(),
    @JsonProperty("keywords")
    val keywords: List<String> = emptyList(),
)

data class AssetStructuredTagsResponse(
    val characters: List<String> = emptyList(),
    val locations: List<String> = emptyList(),
    val keywords: List<String> = emptyList(),
) {
    fun allValues(): List<String> = characters + locations + keywords
}
