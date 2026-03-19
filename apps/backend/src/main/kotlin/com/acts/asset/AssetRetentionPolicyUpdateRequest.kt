package com.acts.asset

data class AssetRetentionPolicyUpdateRequest(
    val trashRetentionDays: Int,
    val restoreEnabled: Boolean,
)
