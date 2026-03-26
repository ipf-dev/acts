package com.acts.asset

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class AssetUpdateRequest @JsonCreator constructor(
    @JsonProperty("title")
    val title: String = "",
    @JsonProperty("description")
    val description: String? = null,
    @JsonProperty("tags")
    val tags: AssetStructuredTagsRequest = AssetStructuredTagsRequest(),
)
