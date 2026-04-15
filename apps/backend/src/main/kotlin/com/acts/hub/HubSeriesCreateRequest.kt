package com.acts.hub

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class HubSeriesCreateRequest @JsonCreator constructor(
    @JsonProperty("name")
    val name: String = "",
)
