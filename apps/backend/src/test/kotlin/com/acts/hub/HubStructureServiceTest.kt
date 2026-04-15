package com.acts.hub

import com.acts.asset.preview.AssetPreviewDispatcher
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
class HubStructureServiceTest @Autowired constructor(
    private val hubNavigationService: HubNavigationService,
    private val hubStructureService: HubStructureService,
    private val organizationRepository: OrganizationRepository,
    private val userDirectoryService: UserDirectoryService,
) {
    @MockBean
    private lateinit var assetBinaryStorage: AssetBinaryStorage

    @MockBean
    private lateinit var assetPreviewDispatcher: AssetPreviewDispatcher

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
    }

    @Test
    fun `creates empty series and keeps it visible in navigation`() {
        val initialNavigation = hubNavigationService.getNavigation(actorEmail = TEST_CREATOR_EMAIL)
        val createdSeries = hubStructureService.createSeries(
            name = "코코월드",
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val navigation = hubNavigationService.getNavigation(actorEmail = TEST_CREATOR_EMAIL)

        assertThat(initialNavigation.series).isEmpty()
        assertThat(createdSeries.label).isEqualTo("코코월드")
        assertThat(createdSeries.levels).isEmpty()
        assertThat(navigation.series.map { series -> series.label }).contains("코코월드")
        assertThat(
            navigation.series.first { series -> series.key == createdSeries.key }.levels,
        ).isEmpty()
    }

    @Test
    fun `creates selected level and keeps empty level visible in navigation`() {
        val harmonyHillsSeries = hubStructureService.createSeries(
            name = "Harmony Hills",
            actorEmail = TEST_CREATOR_EMAIL,
        )
        (1..3).forEach { levelNumber ->
            hubStructureService.createLevel(
                seriesKey = harmonyHillsSeries.key,
                levelNumber = levelNumber,
                actorEmail = TEST_CREATOR_EMAIL,
            )
        }

        val createdLevel = hubStructureService.createLevel(
            seriesKey = harmonyHillsSeries.key,
            levelNumber = 7,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val navigation = hubNavigationService.getNavigation(actorEmail = TEST_CREATOR_EMAIL)
        val loadedSeries = navigation.series.first { series -> series.key == harmonyHillsSeries.key }

        assertThat(createdLevel.label).isEqualTo("Level 7")
        assertThat(loadedSeries.levels.map { level -> level.label }).containsExactly(
            "Level 1",
            "Level 2",
            "Level 3",
            "Level 7",
        )
        assertThat(
            loadedSeries.levels.first { level -> level.key == createdLevel.key }.episodes,
        ).isEmpty()
    }
}
