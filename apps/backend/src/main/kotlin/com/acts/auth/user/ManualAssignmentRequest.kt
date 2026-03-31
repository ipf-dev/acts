package com.acts.auth.user

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty

data class ManualAssignmentRequest @JsonCreator constructor(
    @JsonProperty("organizationId")
    val organizationId: Long = 0L,
)
