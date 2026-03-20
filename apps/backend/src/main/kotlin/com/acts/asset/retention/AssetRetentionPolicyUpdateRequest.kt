package com.acts.asset.retention

data class AssetRetentionPolicyUpdateRequest(
    val trashRetentionDays: Int,
    val restoreEnabled: Boolean,
)
