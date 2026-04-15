package com.acts.hub

data class HubNavigationResponse(
    val series: List<HubSeriesNavigationResponse>,
)

data class HubSeriesNavigationResponse(
    val key: String,
    val label: String,
    val levels: List<HubLevelNavigationResponse>,
)

data class HubLevelNavigationResponse(
    val key: String,
    val label: String,
    val episodes: List<HubEpisodeNavigationResponse>,
)

data class HubEpisodeNavigationResponse(
    val key: String,
    val code: String,
    val title: String,
)
