package com.acts.hub

private const val DEFAULT_NAME_MAX_LENGTH = 120

fun normalizeRequiredName(name: String, fieldLabel: String, maxLength: Int = DEFAULT_NAME_MAX_LENGTH): String {
    val normalizedName = name.trim()
    require(normalizedName.isNotEmpty()) { "${fieldLabel}은(는) 필수입니다." }
    require(normalizedName.length <= maxLength) { "${fieldLabel}은(는) ${maxLength}자 이하여야 합니다." }
    return normalizedName
}
