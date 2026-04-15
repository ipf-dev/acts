package com.acts.hub

data class HubDefaultEpisodeSlotTemplate(
    val name: String,
    val sortOrder: Int,
)

object HubDefaultEpisodeSlots {
    val templates: List<HubDefaultEpisodeSlotTemplate> = listOf(
        HubDefaultEpisodeSlotTemplate(name = "시나리오", sortOrder = 1),
        HubDefaultEpisodeSlotTemplate(name = "캐릭터 시트", sortOrder = 2),
        HubDefaultEpisodeSlotTemplate(name = "배경 이미지", sortOrder = 3),
        HubDefaultEpisodeSlotTemplate(name = "성우 음원", sortOrder = 4),
        HubDefaultEpisodeSlotTemplate(name = "스토리보드", sortOrder = 5),
        HubDefaultEpisodeSlotTemplate(name = "원본 도서", sortOrder = 6),
        HubDefaultEpisodeSlotTemplate(name = "애니메이션", sortOrder = 7),
        HubDefaultEpisodeSlotTemplate(name = "챈트", sortOrder = 8),
        HubDefaultEpisodeSlotTemplate(name = "LAURA Activity", sortOrder = 9),
    )
}
