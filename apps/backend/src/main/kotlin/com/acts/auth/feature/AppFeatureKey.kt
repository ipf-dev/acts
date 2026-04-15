package com.acts.auth.feature

enum class AppFeatureKey(
    val label: String,
    val description: String,
    val defaultAllowed: Boolean,
    val implemented: Boolean,
) {
    ASSET_LIBRARY(
        label = "에셋 라이브러리",
        description = "에셋을 업로드/조회/검색하고 상세를 확인하는 기능입니다.",
        defaultAllowed = true,
        implemented = true,
    ),
}

data class AppFeatureResponse(
    val key: AppFeatureKey,
    val label: String,
    val description: String,
    val implemented: Boolean,
)

fun AppFeatureKey.toResponse(): AppFeatureResponse = AppFeatureResponse(
    key = this,
    label = label,
    description = description,
    implemented = implemented,
)
