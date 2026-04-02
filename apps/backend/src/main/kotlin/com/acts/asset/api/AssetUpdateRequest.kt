package com.acts.asset.api

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class AssetUpdateRequest @JsonCreator constructor(
    @JsonProperty("title")
    val title: String = "",
    @JsonProperty("description")
    val description: String? = null,
    @JsonProperty("tags")
    val tags: AssetStructuredTagsRequest = AssetStructuredTagsRequest(),
    @JsonProperty("typeMetadata")
    val typeMetadata: AssetTypeMetadataRequest = AssetTypeMetadataRequest(),
)
