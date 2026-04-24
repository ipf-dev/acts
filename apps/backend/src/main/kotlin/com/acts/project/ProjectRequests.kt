package com.acts.project

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import java.time.LocalDate

data class ProjectCreateRequest @JsonCreator constructor(
    @JsonProperty("name")
    val name: String = "",
    @JsonProperty("description")
    val description: String? = null,
    @JsonProperty("organizationId")
    val organizationId: Long = 0,
    @JsonProperty("deadline")
    val deadline: LocalDate? = null,
)

data class ProjectUpdateRequest @JsonCreator constructor(
    @JsonProperty("name")
    val name: String = "",
    @JsonProperty("description")
    val description: String? = null,
    @JsonProperty("organizationId")
    val organizationId: Long = 0,
    @JsonProperty("deadline")
    val deadline: LocalDate? = null,
    @JsonProperty("completed")
    val completed: Boolean = false,
)

data class ProjectAssetLinkRequest @JsonCreator constructor(
    @JsonProperty("assetId")
    val assetId: Long = 0,
)
