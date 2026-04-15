package com.acts.hub

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class HubLevelCreateRequest @JsonCreator constructor(
    @JsonProperty("levelNumber")
    val levelNumber: Int? = null,
)
