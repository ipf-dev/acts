package com.acts.hub

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class HubEpisodeSlotAssetLinkRequest @JsonCreator constructor(
    @JsonProperty("assetId")
    val assetId: Long = 0,
)
