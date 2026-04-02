package com.acts.asset.api

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class AssetUploadIntentRequest @JsonCreator constructor(
    @JsonProperty("fileName")
    val fileName: String = "",
    @JsonProperty("contentType")
    val contentType: String = "",
    @JsonProperty("fileSizeBytes")
    val fileSizeBytes: Long = 0,
    @JsonProperty("title")
    val title: String? = null,
    @JsonProperty("description")
    val description: String? = null,
    @JsonProperty("tags")
    val tags: AssetStructuredTagsRequest = AssetStructuredTagsRequest(),
    @JsonProperty("typeMetadata")
    val typeMetadata: AssetTypeMetadataRequest = AssetTypeMetadataRequest(),
)
