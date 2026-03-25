package com.acts.asset

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class AssetLinkRegistrationRequest @JsonCreator constructor(
    @JsonProperty("links")
    val links: List<AssetLinkRegistrationItemRequest> = emptyList(),
)

data class AssetLinkRegistrationItemRequest @JsonCreator constructor(
    @JsonProperty("url")
    val url: String = "",
    @JsonProperty("title")
    val title: String? = null,
    @JsonProperty("linkType")
    val linkType: String? = null,
    @JsonProperty("tags")
    val tags: List<String> = emptyList(),
)
