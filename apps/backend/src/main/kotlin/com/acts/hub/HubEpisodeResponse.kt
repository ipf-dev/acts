package com.acts.hub

import com.acts.asset.api.AssetSummaryResponse

data class HubEpisodeResponse(
    val seriesKey: String,
    val seriesLabel: String,
    val levelKey: String,
    val levelLabel: String,
    val episodeKey: String,
    val episodeCode: String,
    val episodeTitle: String,
    val episodeDescription: String?,
    val slots: List<HubEpisodeSlotResponse>,
)

data class HubEpisodeSlotResponse(
    val slotId: Long,
    val slotName: String,
    val slotOrder: Int,
    val linkedAssets: List<AssetSummaryResponse>,
)
