package com.acts.asset

import com.acts.asset.event.AssetEventType
import com.acts.asset.preview.AssetPreviewGenerator
import com.acts.asset.preview.GeneratedAssetPreview
import com.acts.asset.storage.AssetBinaryStorage
import com.acts.asset.storage.LoadedAssetObject
import com.acts.asset.storage.StoredAssetObject
import com.acts.auth.feature.UserFeatureAccessService
import com.acts.auth.org.OrganizationRepository
import com.acts.auth.user.UserDirectoryService
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.atLeastOnce
import org.mockito.kotlin.argThat
import org.mockito.kotlin.eq
import org.mockito.kotlin.verify
import org.mockito.kotlin.any
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.transaction.annotation.Transactional
import java.text.Normalizer

@SpringBootTest
@Transactional
class AssetLibraryServiceTest @Autowired constructor(
    private val assetLibraryService: AssetLibraryService,
    private val organizationRepository: OrganizationRepository,
    private val userDirectoryService: UserDirectoryService,
    private val userFeatureAccessService: UserFeatureAccessService,
) {
    @MockBean
    private lateinit var assetBinaryStorage: AssetBinaryStorage

    @MockBean
    private lateinit var assetPreviewGenerator: AssetPreviewGenerator

    @BeforeEach
    fun prepareUser() {
        val marketingOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == "마케팅팀" }
        val contentOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == "콘텐츠개발1팀" }
        val strategyOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == "AI전략사업팀" }

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
        userDirectoryService.syncLogin(
            email = "tony@iportfolio.co.kr",
            displayName = "Tony",
        )
        userDirectoryService.saveManualAssignment(
            email = "tony@iportfolio.co.kr",
            organizationId = requireNotNull(contentOrganization.id),
            positionTitle = "디자이너",
            actorEmail = "minsungkim@iportfolio.co.kr",
            actorName = "Min Sung Kim",
        )
        userDirectoryService.syncLogin(
            email = "leader@iportfolio.co.kr",
            displayName = "Leader",
        )
        userDirectoryService.saveManualAssignment(
            email = "leader@iportfolio.co.kr",
            organizationId = requireNotNull(strategyOrganization.id),
            positionTitle = "본부장",
            actorEmail = "minsungkim@iportfolio.co.kr",
            actorName = "Min Sung Kim",
        )
        userDirectoryService.addViewerAllowlist(
            email = "leader@iportfolio.co.kr",
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
        whenever(assetBinaryStorage.loadOrNull(any(), any())).thenReturn(null)
        whenever(assetPreviewGenerator.generateVideoPreview(any(), any())).thenReturn(null)
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
            actorEmail = "coco@iportfolio.co.kr",
            query = AssetListQuery(search = "코코 축제"),
        )

        assertThat(uploadedAsset.type).isEqualTo(AssetType.SCENARIO)
        assertThat(uploadedAsset.organizationName).isEqualTo("마케팅팀")
        assertThat(uploadedAsset.ownerEmail).isEqualTo("coco@iportfolio.co.kr")
        assertThat(uploadedAsset.tags).contains("코코", "축제", "시나리오", "coco", "festival", "story")
        assertThat(uploadedAsset.canEdit).isTrue()
        assertThat(uploadedAsset.canDelete).isTrue()
        assertThat(uploadedAsset.canDownload).isTrue()
        assertThat(listedAssets).hasSize(1)
        assertThat(listedAssets.single().id).isEqualTo(uploadedAsset.id)
    }

    @Test
    fun `matches korean search terms even when uploaded file name is stored in decomposed unicode`() {
        val decomposedFileName = Normalizer.normalize("폴리17.png", Normalizer.Form.NFD)

        val uploadedAsset = assetLibraryService.uploadAsset(
            AssetUploadCommand(
                actorEmail = "coco@iportfolio.co.kr",
                actorName = "Coco",
                title = "폴리17",
                description = "한글 파일명 검색 테스트",
                requestedTags = emptyList(),
                sourceDetail = "외부 등록",
                fileName = decomposedFileName,
                contentType = "image/png",
                contentBytes = "image".toByteArray(),
            ),
        )

        val partialMatch = assetLibraryService.listAssets(
            actorEmail = "coco@iportfolio.co.kr",
            query = AssetListQuery(search = "폴"),
        )
        val fullMatch = assetLibraryService.listAssets(
            actorEmail = "coco@iportfolio.co.kr",
            query = AssetListQuery(search = "폴리17"),
        )

        assertThat(partialMatch).extracting("id").contains(uploadedAsset.id)
        assertThat(fullMatch).extracting("id").contains(uploadedAsset.id)
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

        val assetDetail = assetLibraryService.getAsset(
            assetId = uploadedAsset.id,
            actorEmail = "coco@iportfolio.co.kr",
        )
        val downloadResult = assetLibraryService.downloadAsset(
            assetId = uploadedAsset.id,
            actorEmail = "coco@iportfolio.co.kr",
        )

        assertThat(assetDetail.currentFile.originalFileName).isEqualTo("coco_festival_story.txt")
        assertThat(assetDetail.events).hasSize(1)
        assertThat(assetDetail.events.single().eventType).isEqualTo(AssetEventType.CREATED)
        assertThat(assetDetail.tags).contains("코코", "축제")
        assertThat(assetDetail.canEdit).isTrue()
        assertThat(assetDetail.canDelete).isTrue()
        assertThat(assetDetail.canDownload).isTrue()
        assertThat(downloadResult.fileName).isEqualTo("coco_festival_story.txt")
        assertThat(downloadResult.contentType).isEqualTo("text/plain")
        assertThat(downloadResult.content).containsExactly(*"story".toByteArray())
    }

    @Test
    fun `returns image preview from original asset bytes`() {
        whenever(assetBinaryStorage.load(any(), any())).thenReturn(
            LoadedAssetObject(
                content = byteArrayOf(1, 2, 3),
                contentType = "image/png",
            ),
        )

        val uploadedAsset = assetLibraryService.uploadAsset(
            AssetUploadCommand(
                actorEmail = "coco@iportfolio.co.kr",
                actorName = "Coco",
                title = "이미지 프리뷰 테스트",
                description = "프리뷰 설명",
                requestedTags = listOf("이미지"),
                sourceDetail = "외부 등록",
                fileName = "preview-image.png",
                contentType = "image/png",
                contentBytes = "image".toByteArray(),
            ),
        )

        val previewResult = assetLibraryService.loadPreview(
            assetId = uploadedAsset.id,
            actorEmail = "tony@iportfolio.co.kr",
        )

        assertThat(previewResult.contentType).isEqualTo("image/png")
        assertThat(previewResult.content).containsExactly(1, 2, 3)
    }

    @Test
    fun `generates and returns video thumbnail preview`() {
        whenever(assetPreviewGenerator.generateVideoPreview(eq("preview-video.mp4"), any())).thenReturn(
            GeneratedAssetPreview(
                content = byteArrayOf(9, 8, 7),
                contentType = "image/jpeg",
            ),
        )
        whenever(assetBinaryStorage.load(any(), any())).thenReturn(
            LoadedAssetObject(
                content = "video-binary".toByteArray(),
                contentType = "video/mp4",
            ),
        )

        val uploadedAsset = assetLibraryService.uploadAsset(
            AssetUploadCommand(
                actorEmail = "coco@iportfolio.co.kr",
                actorName = "Coco",
                title = "영상 프리뷰 테스트",
                description = "썸네일 생성",
                requestedTags = listOf("영상"),
                sourceDetail = "외부 등록",
                fileName = "preview-video.mp4",
                contentType = "video/mp4",
                contentBytes = "video-binary".toByteArray(),
            ),
        )

        val previewResult = assetLibraryService.loadPreview(
            assetId = uploadedAsset.id,
            actorEmail = "tony@iportfolio.co.kr",
        )

        assertThat(previewResult.contentType).isEqualTo("image/jpeg")
        assertThat(previewResult.content).containsExactly(9, 8, 7)
        verify(assetBinaryStorage, atLeastOnce()).store(
            objectKey = eq("assets/test/coco.txt.preview.jpg"),
            contentType = eq("image/jpeg"),
            content = argThat { contentEquals(byteArrayOf(9, 8, 7)) },
        )
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

    @Test
    fun `soft deletes asset and excludes it from library queries`() {
        val uploadedAsset = assetLibraryService.uploadAsset(
            AssetUploadCommand(
                actorEmail = "coco@iportfolio.co.kr",
                actorName = "Coco",
                title = "삭제 테스트 애셋",
                description = "삭제 설명",
                requestedTags = listOf("삭제"),
                sourceDetail = "외부 등록",
                fileName = "delete_test.txt",
                contentType = "text/plain",
                contentBytes = "story".toByteArray(),
            ),
        )

        assetLibraryService.deleteAsset(
            assetId = uploadedAsset.id,
            actorEmail = "coco@iportfolio.co.kr",
            actorName = "Coco",
        )

        val listedAssets = assetLibraryService.listAssets(actorEmail = "coco@iportfolio.co.kr")

        assertThat(listedAssets).noneMatch { asset -> asset.id == uploadedAsset.id }
        assertThatThrownBy {
            assetLibraryService.getAsset(
                assetId = uploadedAsset.id,
                actorEmail = "coco@iportfolio.co.kr",
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("자산을 찾을 수 없습니다")
    }

    @Test
    fun `rejects delete request from non owner non admin`() {
        val uploadedAsset = assetLibraryService.uploadAsset(
            AssetUploadCommand(
                actorEmail = "coco@iportfolio.co.kr",
                actorName = "Coco",
                title = "삭제 권한 테스트 애셋",
                description = "삭제 설명",
                requestedTags = listOf("삭제"),
                sourceDetail = "외부 등록",
                fileName = "delete_permission_test.txt",
                contentType = "text/plain",
                contentBytes = "story".toByteArray(),
            ),
        )
        assertThatThrownBy {
            assetLibraryService.deleteAsset(
                assetId = uploadedAsset.id,
                actorEmail = "tony@iportfolio.co.kr",
                actorName = "Tony",
            )
        }
            .isInstanceOf(SecurityException::class.java)
            .hasMessageContaining("삭제 권한이 없습니다")
    }

    @Test
    fun `shows all assets to every authenticated user`() {
        val marketingAsset = uploadAsset(
            actorEmail = "coco@iportfolio.co.kr",
            actorName = "Coco",
            title = "마케팅 전용 애셋",
            fileName = "marketing.txt",
        )
        val contentAsset = uploadAsset(
            actorEmail = "tony@iportfolio.co.kr",
            actorName = "Tony",
            title = "콘텐츠 전용 애셋",
            fileName = "content.txt",
        )

        val contentUserVisibleAssets = assetLibraryService.listAssets(actorEmail = "tony@iportfolio.co.kr")
        val companyWideVisibleAssets = assetLibraryService.listAssets(actorEmail = "leader@iportfolio.co.kr")

        assertThat(contentUserVisibleAssets).extracting("id").contains(marketingAsset.id, contentAsset.id)
        assertThat(companyWideVisibleAssets).extracting("id").contains(marketingAsset.id, contentAsset.id)
    }

    @Test
    fun `allows detail and download across organizations`() {
        val uploadedAsset = uploadAsset(
            actorEmail = "coco@iportfolio.co.kr",
            actorName = "Coco",
            title = "마케팅 전용 애셋",
            fileName = "marketing-detail.txt",
        )

        val assetDetail = assetLibraryService.getAsset(
            assetId = uploadedAsset.id,
            actorEmail = "tony@iportfolio.co.kr",
        )
        val downloadResult = assetLibraryService.downloadAsset(
            assetId = uploadedAsset.id,
            actorEmail = "tony@iportfolio.co.kr",
        )

        assertThat(assetDetail.id).isEqualTo(uploadedAsset.id)
        assertThat(downloadResult.fileName).isEqualTo("marketing-detail.txt")
    }

    @Test
    fun `allows company wide viewer export and blocks regular users`() {
        uploadAsset(
            actorEmail = "coco@iportfolio.co.kr",
            actorName = "Coco",
            title = "마케팅 애셋",
            fileName = "marketing-export.txt",
        )
        uploadAsset(
            actorEmail = "tony@iportfolio.co.kr",
            actorName = "Tony",
            title = "콘텐츠 애셋",
            fileName = "content-export.txt",
        )

        val exportResult = assetLibraryService.exportAssets("leader@iportfolio.co.kr")

        assertThat(exportResult.contentType).isEqualTo("application/zip")
        assertThat(exportResult.fileName).endsWith(".zip")
        assertThat(exportResult.content).isNotEmpty

        assertThatThrownBy { assetLibraryService.exportAssets("tony@iportfolio.co.kr") }
            .isInstanceOf(SecurityException::class.java)
            .hasMessageContaining("내보내기 권한")
    }

    @Test
    fun `denied asset library feature blocks asset access`() {
        uploadAsset(
            actorEmail = "coco@iportfolio.co.kr",
            actorName = "Coco",
            title = "권한 테스트 애셋",
            fileName = "permission.txt",
        )
        userDirectoryService.syncLogin(
            email = "sohee.han@iportfolio.co.kr",
            displayName = "한소희",
        )
        userFeatureAccessService.saveUserFeatureAccess(
            email = "sohee.han@iportfolio.co.kr",
            allowedFeatureKeys = emptyList(),
            actorEmail = "minsungkim@iportfolio.co.kr",
            actorName = "Min Sung Kim",
        )

        assertThatThrownBy {
            assetLibraryService.listAssets(actorEmail = "sohee.han@iportfolio.co.kr")
        }
            .isInstanceOf(SecurityException::class.java)
            .hasMessageContaining("자산 라이브러리")
    }

    private fun uploadAsset(
        actorEmail: String,
        actorName: String,
        title: String,
        fileName: String,
    ): AssetSummaryResponse = assetLibraryService.uploadAsset(
        AssetUploadCommand(
            actorEmail = actorEmail,
            actorName = actorName,
            title = title,
            description = "설명",
            requestedTags = listOf("태그"),
            sourceDetail = "외부 등록",
            fileName = fileName,
            contentType = "text/plain",
            contentBytes = "story".toByteArray(),
        ),
    )
}
