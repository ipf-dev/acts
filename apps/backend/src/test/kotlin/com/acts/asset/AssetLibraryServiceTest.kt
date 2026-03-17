package com.acts.asset

import com.acts.auth.OrganizationRepository
import com.acts.auth.UserDirectoryService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@Transactional
class AssetLibraryServiceTest @Autowired constructor(
    private val assetLibraryService: AssetLibraryService,
    private val organizationRepository: OrganizationRepository,
    private val userDirectoryService: UserDirectoryService,
) {
    @MockBean
    private lateinit var assetBinaryStorage: AssetBinaryStorage

    @BeforeEach
    fun prepareUser() {
        val marketingOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == "마케팅팀" }

        userDirectoryService.syncLogin(
            email = "coco@iportfolio.co.kr",
            displayName = "Coco",
        )
        userDirectoryService.saveManualAssignment(
            email = "coco@iportfolio.co.kr",
            organizationId = requireNotNull(marketingOrganization.id),
            positionTitle = "기획자",
            actorEmail = "minsungkim@iportfolio.co.kr",
            actorName = "Min Sung Kim",
        )
        whenever(assetBinaryStorage.store(any(), any(), any())).thenReturn(
            StoredAssetObject(
                bucket = "acts-assets",
                objectKey = "assets/test/coco.txt",
            ),
        )
        whenever(assetBinaryStorage.load(any(), any())).thenReturn(
            LoadedAssetObject(
                content = "story".toByteArray(),
                contentType = "text/plain",
            ),
        )
    }

    @Test
    fun `stores uploaded asset metadata tags and creator organization`() {
        val uploadedAsset = assetLibraryService.uploadAsset(
            AssetUploadCommand(
                actorEmail = "coco@iportfolio.co.kr",
                actorName = "Coco",
                title = "코코의 첫 모험 시나리오",
                description = "축제에 가는 이야기 초안",
                requestedTags = listOf("코코", "축제"),
                sourceDetail = "외부 등록",
                fileName = "coco_festival_story.txt",
                contentType = "text/plain",
                contentBytes = "story".toByteArray(),
            ),
        )

        val listedAssets = assetLibraryService.listAssets(
            AssetListQuery(search = "코코 축제"),
        )

        assertThat(uploadedAsset.type).isEqualTo(AssetType.SCENARIO)
        assertThat(uploadedAsset.organizationName).isEqualTo("마케팅팀")
        assertThat(uploadedAsset.ownerEmail).isEqualTo("coco@iportfolio.co.kr")
        assertThat(uploadedAsset.tags).contains("코코", "축제", "시나리오", "coco", "festival", "story")
        assertThat(listedAssets).hasSize(1)
        assertThat(listedAssets.single().id).isEqualTo(uploadedAsset.id)
    }

    @Test
    fun `returns asset detail with history and downloadable file`() {
        val uploadedAsset = assetLibraryService.uploadAsset(
            AssetUploadCommand(
                actorEmail = "coco@iportfolio.co.kr",
                actorName = "Coco",
                title = "코코의 첫 모험 시나리오",
                description = "축제에 가는 이야기 초안",
                requestedTags = listOf("코코", "축제"),
                sourceDetail = "외부 등록",
                fileName = "coco_festival_story.txt",
                contentType = "text/plain",
                contentBytes = "story".toByteArray(),
            ),
        )

        val assetDetail = assetLibraryService.getAsset(uploadedAsset.id)
        val downloadResult = assetLibraryService.downloadAsset(uploadedAsset.id)

        assertThat(assetDetail.currentFile.originalFileName).isEqualTo("coco_festival_story.txt")
        assertThat(assetDetail.events).hasSize(1)
        assertThat(assetDetail.events.single().eventType).isEqualTo(AssetEventType.CREATED)
        assertThat(assetDetail.tags).contains("코코", "축제")
        assertThat(downloadResult.fileName).isEqualTo("coco_festival_story.txt")
        assertThat(downloadResult.contentType).isEqualTo("text/plain")
        assertThat(downloadResult.content).containsExactly(*"story".toByteArray())
    }

    @Test
    fun `updates asset metadata and records an update history event`() {
        val uploadedAsset = assetLibraryService.uploadAsset(
            AssetUploadCommand(
                actorEmail = "coco@iportfolio.co.kr",
                actorName = "Coco",
                title = "코코의 첫 모험 시나리오",
                description = "초기 설명",
                requestedTags = listOf("코코", "축제"),
                sourceDetail = "외부 등록",
                fileName = "coco_festival_story.txt",
                contentType = "text/plain",
                contentBytes = "story".toByteArray(),
            ),
        )

        val updatedAsset = assetLibraryService.updateAsset(
            assetId = uploadedAsset.id,
            title = "코코와 친구들의 축제",
            description = "업데이트된 설명",
            requestedTags = listOf("코코", "친구들", "축제"),
            actorEmail = "coco@iportfolio.co.kr",
            actorName = "Coco",
        )

        assertThat(updatedAsset.title).isEqualTo("코코와 친구들의 축제")
        assertThat(updatedAsset.description).isEqualTo("업데이트된 설명")
        assertThat(updatedAsset.tags).contains("코코", "친구들", "축제")
        assertThat(updatedAsset.events).hasSize(2)
        assertThat(updatedAsset.events.first().eventType).isEqualTo(AssetEventType.METADATA_UPDATED)
        assertThat(updatedAsset.events.first().detail).contains("제목", "설명", "태그")
    }
}
