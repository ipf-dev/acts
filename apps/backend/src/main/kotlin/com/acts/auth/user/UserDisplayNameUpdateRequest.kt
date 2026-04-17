package com.acts.auth.user

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class UserDisplayNameUpdateRequest @JsonCreator constructor(
    @JsonProperty("displayName")
    val displayName: String = "",
)
