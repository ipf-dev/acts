package com.acts.hub

import com.acts.asset.api.AssetLinkRegistrationItemRequest
import com.acts.asset.api.AssetLinkRegistrationRequest
import com.acts.asset.api.AssetStructuredTagsRequest
import com.acts.asset.preview.AssetPreviewDispatcher
import com.acts.asset.service.AssetLibraryService
import com.acts.asset.storage.AssetBinaryStorage
import com.acts.auth.org.OrganizationRepository
import com.acts.auth.user.UserDirectoryService
import com.acts.support.TEST_ADMIN_EMAIL
import com.acts.support.TEST_ADMIN_NAME
import com.acts.support.TEST_CONTENT_ORG_NAME
import com.acts.support.TEST_CREATOR_EMAIL
import com.acts.support.TEST_CREATOR_NAME
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@Transactional
class HubEpisodeServiceTest @Autowired constructor(
    private val assetLibraryService: AssetLibraryService,
    private val hubEpisodeService: HubEpisodeService,
    private val hubNavigationService: HubNavigationService,
    private val hubStructureService: HubStructureService,
    private val organizationRepository: OrganizationRepository,
    private val userDirectoryService: UserDirectoryService,
) {
    @MockBean
    private lateinit var assetBinaryStorage: AssetBinaryStorage

    @MockBean
    private lateinit var assetPreviewDispatcher: AssetPreviewDispatcher

    private lateinit var fixture: HarmonyHillsFixture

    @BeforeEach
    fun prepareUser() {
        val contentOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == TEST_CONTENT_ORG_NAME }

        userDirectoryService.syncLogin(
            email = TEST_CREATOR_EMAIL,
            displayName = TEST_CREATOR_NAME,
        )
        userDirectoryService.saveManualAssignment(
            email = TEST_CREATOR_EMAIL,
            organizationId = requireNotNull(contentOrganization.id),
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )

        fixture = createHarmonyHillsFixture()
    }

    @Test
    fun `loads default episode slots in configured order`() {
        val episode = hubEpisodeService.getEpisode(
            episodeKey = fixture.levelOneEpisodeOneKey,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        assertThat(episode.seriesLabel).isEqualTo("Harmony Hills")
        assertThat(episode.levelLabel).isEqualTo("Level 1")
        assertThat(episode.episodeCode).isEqualTo("EP01")
        assertThat(episode.episodeTitle).isEqualTo("EP01")
        assertThat(episode.slots).hasSize(9)
        assertThat(episode.slots.map { slot -> slot.slotName }).containsExactly(
            "시나리오",
            "캐릭터 시트",
            "배경 이미지",
            "성우 음원",
            "스토리보드",
            "원본 도서",
            "애니메이션",
            "챈트",
            "LAURA Activity",
        )
        assertThat(episode.slots.map { slot -> slot.slotId }).doesNotContainNull()
        assertThat(episode.slots).allSatisfy { slot -> assertThat(slot.linkedAssets).isEmpty() }
    }

    @Test
    fun `loads hub navigation tree for created hierarchy`() {
        val navigation = hubNavigationService.getNavigation(actorEmail = TEST_CREATOR_EMAIL)

        assertThat(navigation.series).hasSize(1)
        assertThat(navigation.series.single().label).isEqualTo("Harmony Hills")
        assertThat(navigation.series.single().levels.map { level -> level.label }).containsExactly(
            "Level 1",
            "Level 2",
            "Level 3",
        )
        assertThat(navigation.series.single().levels.first().episodes.map { episode -> episode.code }).containsExactly(
            "EP01",
            "EP02",
        )
        assertThat(navigation.series.single().levels.first().episodes.map { episode -> episode.title }).containsExactly(
            "EP01",
            "EP02",
        )
    }

    @Test
    fun `creates episode with description and updates metadata`() {
        val createdEpisode = hubEpisodeService.createEpisode(
            levelKey = fixture.levelOneKey,
            name = "시장 가는 날",
            description = "토니와 친구들이 시장에서 규칙과 순서를 배우는 에피소드",
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val updatedEpisode = hubEpisodeService.updateEpisode(
            episodeKey = createdEpisode.episodeKey,
            name = "시장 탐험",
            description = "토니와 친구들이 시장을 탐험하며 협력과 기다림을 익히는 에피소드",
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val navigation = hubNavigationService.getNavigation(actorEmail = TEST_CREATOR_EMAIL)

        assertThat(createdEpisode.episodeCode).isEqualTo("EP03")
        assertThat(createdEpisode.episodeTitle).isEqualTo("시장 가는 날")
        assertThat(createdEpisode.episodeDescription).isEqualTo("토니와 친구들이 시장에서 규칙과 순서를 배우는 에피소드")
        assertThat(createdEpisode.slots).hasSize(9)
        assertThat(updatedEpisode.episodeKey).isEqualTo(createdEpisode.episodeKey)
        assertThat(updatedEpisode.episodeCode).isEqualTo("EP03")
        assertThat(updatedEpisode.episodeTitle).isEqualTo("시장 탐험")
        assertThat(updatedEpisode.episodeDescription).isEqualTo("토니와 친구들이 시장을 탐험하며 협력과 기다림을 익히는 에피소드")
        assertThat(navigation.series.single().levels.first().episodes.map { episode -> episode.code }).containsExactly(
            "EP01",
            "EP02",
            "EP03",
        )
        assertThat(navigation.series.single().levels.first().episodes.map { episode -> episode.title }).containsExactly(
            "EP01",
            "EP02",
            "시장 탐험",
        )
    }

    @Test
    fun `creates episode with arbitrary episode number`() {
        val createdEpisode = hubEpisodeService.createEpisode(
            levelKey = fixture.levelOneKey,
            name = "코코의 시장 모험",
            description = "코코가 시장에서 차례와 배려를 배우는 에피소드",
            episodeNumber = 20,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val navigation = hubNavigationService.getNavigation(actorEmail = TEST_CREATOR_EMAIL)

        assertThat(createdEpisode.episodeCode).isEqualTo("EP20")
        assertThat(createdEpisode.episodeTitle).isEqualTo("코코의 시장 모험")
        assertThat(navigation.series.single().levels.first().episodes.map { episode -> episode.code }).containsExactly(
            "EP01",
            "EP02",
            "EP20",
        )
        assertThat(navigation.series.single().levels.first().episodes.map { episode -> episode.title }).containsExactly(
            "EP01",
            "EP02",
            "코코의 시장 모험",
        )
    }

    @Test
    fun `deletes episode without renumbering remaining codes`() {
        val createdEpisode = hubEpisodeService.createEpisode(
            levelKey = fixture.levelOneKey,
            name = "삭제할 에피소드",
            description = "잘못 생성된 에피소드",
            episodeNumber = 20,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        hubEpisodeService.deleteEpisode(
            episodeKey = createdEpisode.episodeKey,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val navigation = hubNavigationService.getNavigation(actorEmail = TEST_CREATOR_EMAIL)

        assertThat(navigation.series.single().levels.first().episodes.map { episode -> episode.code }).containsExactly(
            "EP01",
            "EP02",
        )
    }

    @Test
    fun `creates custom slot with provided name`() {
        val createdSlot = hubEpisodeService.createSlot(
            episodeKey = fixture.levelOneEpisodeOneKey,
            name = "참고 자료",
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val loadedEpisode = hubEpisodeService.getEpisode(
            episodeKey = fixture.levelOneEpisodeOneKey,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        assertThat(createdSlot.slotId).isPositive()
        assertThat(createdSlot.slotName).isEqualTo("참고 자료")
        assertThat(createdSlot.slotOrder).isEqualTo(10)
        assertThat(loadedEpisode.slots).hasSize(10)
        assertThat(loadedEpisode.slots.last().slotName).isEqualTo("참고 자료")
    }

    @Test
    fun `deletes any slot from episode`() {
        val createdSlot = hubEpisodeService.createSlot(
            episodeKey = fixture.levelOneEpisodeOneKey,
            name = "삭제할 슬롯",
            actorEmail = TEST_CREATOR_EMAIL,
        )

        hubEpisodeService.deleteSlot(
            episodeKey = fixture.levelOneEpisodeOneKey,
            slotId = createdSlot.slotId,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val loadedEpisode = hubEpisodeService.getEpisode(
            episodeKey = fixture.levelOneEpisodeOneKey,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        assertThat(loadedEpisode.slots.map { slot -> slot.slotName }).doesNotContain("삭제할 슬롯")
        assertThat(loadedEpisode.slots).hasSize(9)

        val scenarioSlot = loadedEpisode.slots.first { slot -> slot.slotName == "시나리오" }

        hubEpisodeService.deleteSlot(
            episodeKey = fixture.levelOneEpisodeOneKey,
            slotId = scenarioSlot.slotId,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val reloadedEpisode = hubEpisodeService.getEpisode(
            episodeKey = fixture.levelOneEpisodeOneKey,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        assertThat(reloadedEpisode.slots.map { slot -> slot.slotName }).doesNotContain("시나리오")
        assertThat(reloadedEpisode.slots).hasSize(8)
    }

    @Test
    fun `links multiple assets and removes one from episode slot`() {
        val firstLinkedAsset = assetLibraryService.registerLinks(
            request = AssetLinkRegistrationRequest(
                links = listOf(
                    AssetLinkRegistrationItemRequest(
                        url = "https://drive.google.com/file/d/episode-scenario",
                        title = "EP01_시나리오_초안",
                        tags = AssetStructuredTagsRequest(
                            keywords = listOf("에피소드", "시나리오"),
                        ),
                    ),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = TEST_CREATOR_NAME,
        ).single()
        val secondLinkedAsset = assetLibraryService.registerLinks(
            request = AssetLinkRegistrationRequest(
                links = listOf(
                    AssetLinkRegistrationItemRequest(
                        url = "https://drive.google.com/file/d/episode-scenario-alt",
                        title = "EP01_시나리오_수정본",
                        tags = AssetStructuredTagsRequest(
                            keywords = listOf("에피소드", "시나리오", "수정"),
                        ),
                    ),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = TEST_CREATOR_NAME,
        ).single()
        val scenarioSlot = hubEpisodeService.getEpisode(
            episodeKey = fixture.levelOneEpisodeOneKey,
            actorEmail = TEST_CREATOR_EMAIL,
        ).slots.first { slot -> slot.slotName == "시나리오" }

        hubEpisodeService.assignAssetToSlot(
            episodeKey = fixture.levelOneEpisodeOneKey,
            slotId = scenarioSlot.slotId,
            assetId = firstLinkedAsset.id,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val linkedSlot = hubEpisodeService.assignAssetToSlot(
            episodeKey = fixture.levelOneEpisodeOneKey,
            slotId = scenarioSlot.slotId,
            assetId = secondLinkedAsset.id,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val loadedEpisode = hubEpisodeService.getEpisode(
            episodeKey = fixture.levelOneEpisodeOneKey,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val remainingSlot = hubEpisodeService.removeAssetFromSlot(
            episodeKey = fixture.levelOneEpisodeOneKey,
            slotId = scenarioSlot.slotId,
            assetId = firstLinkedAsset.id,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        assertThat(linkedSlot.linkedAssets.map { asset -> asset.id }).containsExactly(
            firstLinkedAsset.id,
            secondLinkedAsset.id,
        )
        assertThat(
            loadedEpisode.slots.first { slot -> slot.slotId == scenarioSlot.slotId }.linkedAssets.map { asset -> asset.id },
        ).containsExactly(firstLinkedAsset.id, secondLinkedAsset.id)
        assertThat(remainingSlot.linkedAssets.map { asset -> asset.id }).containsExactly(secondLinkedAsset.id)
    }

    private fun createHarmonyHillsFixture(): HarmonyHillsFixture {
        val series = hubStructureService.createSeries(
            name = "Harmony Hills",
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val levelOne = hubStructureService.createLevel(
            seriesKey = series.key,
            levelNumber = 1,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val levelTwo = hubStructureService.createLevel(
            seriesKey = series.key,
            levelNumber = 2,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val levelThree = hubStructureService.createLevel(
            seriesKey = series.key,
            levelNumber = 3,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val levelOneEpisodeOne = createFixtureEpisode(levelOne.key, 1)
        createFixtureEpisode(levelOne.key, 2)
        createFixtureEpisode(levelTwo.key, 1)
        createFixtureEpisode(levelTwo.key, 2)
        createFixtureEpisode(levelThree.key, 1)
        createFixtureEpisode(levelThree.key, 2)

        return HarmonyHillsFixture(
            seriesKey = series.key,
            levelOneKey = levelOne.key,
            levelOneEpisodeOneKey = levelOneEpisodeOne.episodeKey,
        )
    }

    private fun createFixtureEpisode(levelKey: String, episodeNumber: Int): HubEpisodeResponse =
        hubEpisodeService.createEpisode(
            levelKey = levelKey,
            name = formatEpisodeCode(episodeNumber),
            description = "",
            episodeNumber = episodeNumber,
            actorEmail = TEST_CREATOR_EMAIL,
        )
}

private data class HarmonyHillsFixture(
    val seriesKey: String,
    val levelOneKey: String,
    val levelOneEpisodeOneKey: String,
)

private fun formatEpisodeCode(episodeNumber: Int): String = "EP${episodeNumber.toString().padStart(2, '0')}"
