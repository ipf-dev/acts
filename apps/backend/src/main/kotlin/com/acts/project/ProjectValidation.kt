package com.acts.project

private const val DEFAULT_NAME_MAX_LENGTH = 120
private const val DESCRIPTION_MAX_LENGTH = 2000

fun normalizeProjectName(name: String): String {
    val normalized = name.trim()
    require(normalized.isNotEmpty()) { "프로젝트 이름은 필수입니다." }
    require(normalized.length <= DEFAULT_NAME_MAX_LENGTH) {
        "프로젝트 이름은 ${DEFAULT_NAME_MAX_LENGTH}자 이하여야 합니다."
    }
    return normalized
}

fun normalizeProjectDescription(description: String?): String? {
    val normalized = description?.trim().orEmpty()
    require(normalized.length <= DESCRIPTION_MAX_LENGTH) {
        "프로젝트 설명은 ${DESCRIPTION_MAX_LENGTH}자 이하여야 합니다."
    }
    return normalized.ifEmpty { null }
}

fun slugifyProjectName(value: String): String =
    value
        .lowercase()
        .replace(Regex("[^a-z0-9]+"), "-")
        .trim('-')
        .take(80)
