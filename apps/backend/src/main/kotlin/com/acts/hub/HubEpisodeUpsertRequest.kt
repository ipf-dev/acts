package com.acts.hub

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class HubEpisodeUpsertRequest @JsonCreator constructor(
    @JsonProperty("name")
    val name: String = "",
    @JsonProperty("description")
    val description: String = "",
    @JsonProperty("episodeNumber")
    val episodeNumber: Int? = null,
)
