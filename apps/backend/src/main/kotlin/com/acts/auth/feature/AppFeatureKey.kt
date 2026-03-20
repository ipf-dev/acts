package com.acts.auth.feature

enum class AppFeatureKey(
    val label: String,
    val description: String,
    val defaultAllowed: Boolean,
    val implemented: Boolean,
) {
    ASSET_LIBRARY(
        label = "자산 라이브러리",
        description = "업로드된 자산을 검색하고 상세를 확인하는 현재 운영 기능입니다.",
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
