package com.acts.asset

import com.acts.asset.api.AssetDocumentKind
import com.acts.asset.api.AssetFileAccessMode
import com.acts.asset.api.AssetImageArtStyle
import com.acts.asset.api.AssetLinkRegistrationItemRequest
import com.acts.asset.api.AssetVideoStage
import com.acts.asset.api.AssetLinkRegistrationRequest
import com.acts.asset.api.AssetListQuery
import com.acts.asset.api.AssetMultipartUploadCompleteRequest
import com.acts.asset.api.AssetStructuredTagsRequest
import com.acts.asset.api.AssetSummaryResponse
import com.acts.asset.api.AssetTypeMetadataRequest
import com.acts.asset.domain.AssetSourceKind
import com.acts.asset.domain.AssetType
import com.acts.asset.api.AssetUploadCompleteRequest
import com.acts.asset.api.AssetUploadIntentRequest
import com.acts.asset.api.CompletedPartInput
import com.acts.asset.event.AssetEventType
import com.acts.asset.preview.AssetPreviewDispatcher
import com.acts.asset.preview.VideoPreviewDispatchRequest
import com.acts.asset.service.AssetLibraryService
import com.acts.asset.storage.AssetBinaryStorage
import com.acts.asset.storage.LoadedAssetObject
import com.acts.asset.storage.StoredAssetObject
import com.acts.asset.tag.CharacterTagAliasEntity
import com.acts.asset.tag.CharacterTagAliasRepository
import com.acts.asset.tag.CharacterTagEntity
import com.acts.asset.tag.CharacterTagRepository
import com.acts.asset.tag.AssetTagManagementService
import com.acts.asset.tag.CharacterTagUpsertRequest
import com.acts.auth.feature.UserFeatureAccessService
import com.acts.auth.org.OrganizationRepository
import com.acts.auth.user.UserDirectoryService
import com.acts.support.TEST_ADMIN_EMAIL
import com.acts.support.TEST_ADMIN_NAME
import com.acts.support.TEST_CONTENT_ORG_NAME
import com.acts.support.TEST_CREATOR_EMAIL
import com.acts.support.TEST_MARKETING_ORG_NAME
import com.acts.support.TEST_RESTRICTED_EMAIL
import com.acts.support.TEST_RESTRICTED_NAME
import com.acts.support.TEST_REVIEWER_EMAIL
import com.acts.support.TEST_STRATEGY_ORG_NAME
import com.acts.support.TEST_VIEWER_EMAIL
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.atLeastOnce
import org.mockito.kotlin.argThat
import org.mockito.kotlin.doThrow
import org.mockito.kotlin.eq
import org.mockito.kotlin.verify
import org.mockito.kotlin.any
import org.mockito.kotlin.never
import org.mockito.kotlin.whenever
import org.mockito.Mockito.timeout
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.transaction.annotation.Transactional
import java.text.Normalizer

@SpringBootTest
@Transactional
class AssetLibraryServiceTest @Autowired constructor(
    private val assetLibraryService: AssetLibraryService,
    private val assetTagManagementService: AssetTagManagementService,
    private val characterTagAliasRepository: CharacterTagAliasRepository,
    private val characterTagRepository: CharacterTagRepository,
    private val organizationRepository: OrganizationRepository,
    private val userDirectoryService: UserDirectoryService,
    private val userFeatureAccessService: UserFeatureAccessService,
) {
    @MockBean
    private lateinit var assetBinaryStorage: AssetBinaryStorage

    @MockBean
    private lateinit var assetPreviewDispatcher: AssetPreviewDispatcher

    @BeforeEach
    fun prepareUser() {
        val marketingOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == TEST_MARKETING_ORG_NAME }
        val contentOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == TEST_CONTENT_ORG_NAME }
        val strategyOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == TEST_STRATEGY_ORG_NAME }

        userDirectoryService.syncLogin(
            email = TEST_CREATOR_EMAIL,
            displayName = "Coco",
        )
        userDirectoryService.saveManualAssignment(
            email = TEST_CREATOR_EMAIL,
            organizationId = requireNotNull(marketingOrganization.id),
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )
        userDirectoryService.syncLogin(
            email = TEST_REVIEWER_EMAIL,
            displayName = "Tony",
        )
        userDirectoryService.saveManualAssignment(
            email = TEST_REVIEWER_EMAIL,
            organizationId = requireNotNull(contentOrganization.id),
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )
        userDirectoryService.syncLogin(
            email = TEST_VIEWER_EMAIL,
            displayName = "Leader",
        )
        userDirectoryService.saveManualAssignment(
            email = TEST_VIEWER_EMAIL,
            organizationId = requireNotNull(strategyOrganization.id),
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )
        userDirectoryService.addViewerAllowlist(
            email = TEST_VIEWER_EMAIL,
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )
        whenever(assetBinaryStorage.presignUploadUrl(any(), any(), any())).thenReturn(
            "https://s3.example.com/presigned-url",
        )
        whenever(assetBinaryStorage.presignDownloadUrl(any(), any(), any(), any(), any())).thenReturn(
            "https://s3.example.com/presigned-download-url",
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
        whenever(assetBinaryStorage.exists(any(), any())).thenReturn(true)
    }

    @Test
    fun `stores uploaded asset metadata tags and creator organization`() {
        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "coco_festival_story.txt",
                contentType = "text/plain",
                fileSizeBytes = 5L,
                title = "코코의 첫 모험 시나리오",
                description = "축제에 가는 이야기 초안",
                tags = AssetStructuredTagsRequest(
                    keywords = listOf("코코", "축제"),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )
        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val listedAssets = assetLibraryService.listAssets(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(search = "코코 축제"),
        )

        assertThat(uploadedAsset.type).isEqualTo(AssetType.DOCUMENT)
        assertThat(uploadedAsset.typeMetadata.documentKind).isEqualTo(AssetDocumentKind.SCENARIO)
        assertThat(uploadedAsset.organizationName).isEqualTo(TEST_MARKETING_ORG_NAME)
        assertThat(uploadedAsset.ownerEmail).isEqualTo(TEST_CREATOR_EMAIL)
        assertThat(uploadedAsset.tags.keywords).contains("코코", "축제")
        assertThat(uploadedAsset.canEdit).isTrue()
        assertThat(uploadedAsset.canDelete).isTrue()
        assertThat(uploadedAsset.canDownload).isTrue()
        assertThat(listedAssets).hasSize(1)
        assertThat(listedAssets.single().id).isEqualTo(uploadedAsset.id)
    }

    @Test
    fun `lists asset catalog page with server side pagination and filters`() {
        val marketingOrganizationId = requireNotNull(
            organizationRepository.findAllByOrderByNameAsc()
                .first { organization -> organization.name == TEST_MARKETING_ORG_NAME }
                .id,
        )
        val firstImage = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "코코 배경 1",
            fileName = "coco-background-1.png",
            contentType = "image/png",
            typeMetadata = AssetTypeMetadataRequest(
                imageArtStyle = AssetImageArtStyle.BACKGROUND,
                imageHasLayerFile = true,
            ),
        )
        val secondImage = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "코코 배경 2",
            fileName = "coco-background-2.png",
            contentType = "image/png",
            typeMetadata = AssetTypeMetadataRequest(
                imageArtStyle = AssetImageArtStyle.BACKGROUND,
                imageHasLayerFile = true,
            ),
        )
        uploadAsset(
            actorEmail = TEST_REVIEWER_EMAIL,
            actorName = "Tony",
            title = "토니 러프",
            fileName = "tony-draft.png",
            contentType = "image/png",
            typeMetadata = AssetTypeMetadataRequest(
                imageArtStyle = AssetImageArtStyle.DRAFT,
                imageHasLayerFile = false,
            ),
        )

        val firstPage = assetLibraryService.listAssetCatalog(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(
                assetType = AssetType.IMAGE,
                organizationId = marketingOrganizationId,
                creatorEmail = TEST_CREATOR_EMAIL.uppercase(),
                imageArtStyle = AssetImageArtStyle.BACKGROUND,
                imageHasLayerFile = true,
            ),
            page = 0,
            size = 1,
        )
        val secondPage = assetLibraryService.listAssetCatalog(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(
                assetType = AssetType.IMAGE,
                organizationId = marketingOrganizationId,
                creatorEmail = TEST_CREATOR_EMAIL,
                imageArtStyle = AssetImageArtStyle.BACKGROUND,
                imageHasLayerFile = true,
            ),
            page = 1,
            size = 1,
        )

        assertThat(firstPage.totalItems).isEqualTo(2)
        assertThat(firstPage.totalPages).isEqualTo(2)
        assertThat(firstPage.hasPrevious).isFalse()
        assertThat(firstPage.hasNext).isTrue()
        assertThat(firstPage.items).extracting("id").containsExactly(secondImage.id)
        assertThat(secondPage.hasPrevious).isTrue()
        assertThat(secondPage.hasNext).isFalse()
        assertThat(secondPage.items).extracting("id").containsExactly(firstImage.id)
    }

    @Test
    fun `lists asset catalog filter options from ready assets only`() {
        uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "마케팅 에셋",
            fileName = "marketing-filter.txt",
        )
        uploadAsset(
            actorEmail = TEST_REVIEWER_EMAIL,
            actorName = "Tony",
            title = "콘텐츠 에셋",
            fileName = "content-filter.txt",
        )
        assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "leader-pending.txt",
                contentType = "text/plain",
                fileSizeBytes = 5L,
                title = "리더 대기 에셋",
                description = "아직 완료되지 않은 에셋",
                tags = AssetStructuredTagsRequest(),
            ),
            actorEmail = TEST_VIEWER_EMAIL,
            actorName = "Leader",
        )

        val filterOptions = assetLibraryService.listAssetCatalogFilterOptions(TEST_CREATOR_EMAIL)

        assertThat(filterOptions.organizations).extracting("name").containsExactly(TEST_CONTENT_ORG_NAME, TEST_MARKETING_ORG_NAME)
        assertThat(filterOptions.creators).extracting("email")
            .containsExactly(TEST_CREATOR_EMAIL, TEST_REVIEWER_EMAIL)
    }

    @Test
    fun `dispatches video preview generation to lambda when upload completes`() {
        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "coco-video.mp4",
                contentType = "video/mp4",
                fileSizeBytes = 5L,
                title = "코코 영상",
                description = "람다 썸네일 생성 테스트",
                tags = AssetStructuredTagsRequest(),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )

        assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        verify(assetPreviewDispatcher, timeout(3000)).requestVideoPreview(
            argThat<VideoPreviewDispatchRequest> { objectKey == intentResponse.objectKey },
        )
    }

    @Test
    fun `completes video upload even when preview dispatch fails`() {
        doThrow(IllegalStateException("lambda unavailable"))
            .whenever(assetPreviewDispatcher)
            .requestVideoPreview(any())

        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "coco-video.mp4",
                contentType = "video/mp4",
                fileSizeBytes = 5L,
                title = "코코 영상",
                description = "람다 예외 허용 테스트",
                tags = AssetStructuredTagsRequest(),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )

        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val listedAssets = assetLibraryService.listAssets(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(search = "코코 영상"),
        )

        assertThat(uploadedAsset.id).isPositive()
        assertThat(listedAssets).extracting("id").contains(uploadedAsset.id)
        verify(assetPreviewDispatcher, timeout(3000)).requestVideoPreview(
            argThat<VideoPreviewDispatchRequest> { objectKey == intentResponse.objectKey },
        )
    }

    @Test
    fun `re-dispatches video preview generation when preview is requested before thumbnail exists`() {
        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "coco-video.mp4",
                contentType = "video/mp4",
                fileSizeBytes = 5L,
                title = "코코 영상",
                description = "람다 재요청 테스트",
                tags = AssetStructuredTagsRequest(),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )
        assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )
        whenever(assetBinaryStorage.loadOrNull(any(), eq("${intentResponse.objectKey}.preview.jpg"))).thenReturn(null)

        assertThatThrownBy {
            assetLibraryService.loadPreview(
                assetId = intentResponse.assetId,
                actorEmail = TEST_CREATOR_EMAIL,
            )
        }.isInstanceOf(IllegalArgumentException::class.java)

        verify(assetPreviewDispatcher, timeout(3000).atLeastOnce()).requestVideoPreview(
            argThat<VideoPreviewDispatchRequest> { objectKey == intentResponse.objectKey },
        )
    }

    @Test
    fun `does not expose file assets before upload completion`() {
        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "pending-video.mp4",
                contentType = "video/mp4",
                fileSizeBytes = 5L,
                title = "업로드 중 영상",
                description = "아직 완료되지 않은 에셋",
                tags = AssetStructuredTagsRequest(),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )

        val listedAssets = assetLibraryService.listAssets(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(search = "업로드 중 영상"),
        )

        assertThat(listedAssets).isEmpty()
        assertThatThrownBy {
            assetLibraryService.getAsset(
                assetId = intentResponse.assetId,
                actorEmail = TEST_CREATOR_EMAIL,
            )
        }.isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `stores uploaded asset location tags and matches them in search`() {
        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "library_reference.txt",
                contentType = "text/plain",
                fileSizeBytes = 5L,
                title = "도서관 레퍼런스",
                description = "장소 태그 저장 테스트",
                tags = AssetStructuredTagsRequest(
                    locations = listOf("서울 도서관"),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )
        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val assetDetail = assetLibraryService.getAsset(
            assetId = uploadedAsset.id,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val searchedAssets = assetLibraryService.listAssets(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(search = "서울 도서관"),
        )

        assertThat(uploadedAsset.tags.locations).containsExactly("서울 도서관")
        assertThat(assetDetail.tags.locations).containsExactly("서울 도서관")
        assertThat(searchedAssets).extracting("id").contains(uploadedAsset.id)
    }

    @Test
    fun `lists reusable location and keyword tag options sorted by usage count`() {
        uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "광장 장면 1",
            fileName = "village-square-1.txt",
            requestedTags = AssetStructuredTagsRequest(
                locations = listOf("마을 광장"),
                keywords = listOf("달리기", "낮"),
            ),
        )
        uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "광장 장면 2",
            fileName = "village-square-2.txt",
            requestedTags = AssetStructuredTagsRequest(
                locations = listOf("마을 광장"),
                keywords = listOf("달리기"),
            ),
        )
        uploadAsset(
            actorEmail = TEST_REVIEWER_EMAIL,
            actorName = "Tony",
            title = "숲 장면",
            fileName = "forest-school.txt",
            requestedTags = AssetStructuredTagsRequest(
                locations = listOf("숲속 학교"),
                keywords = listOf("모험"),
            ),
        )

        val tagOptions = assetTagManagementService.listTagOptions(TEST_CREATOR_EMAIL)

        assertThat(tagOptions.locations).extracting("value").containsExactly("마을 광장", "숲속 학교")
        assertThat(tagOptions.locations).extracting("usageCount").containsExactly(2L, 1L)
        assertThat(tagOptions.keywords).extracting("value").containsExactly("달리기", "낮", "모험")
        assertThat(tagOptions.keywords).extracting("usageCount").containsExactly(2L, 1L, 1L)
    }

    @Test
    fun `matches korean search terms even when uploaded file name is stored in decomposed unicode`() {
        val decomposedFileName = Normalizer.normalize("폴리17.png", Normalizer.Form.NFD)

        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = decomposedFileName,
                contentType = "image/png",
                fileSizeBytes = 5L,
                title = "폴리17",
                description = "한글 파일명 검색 테스트",
                tags = AssetStructuredTagsRequest(),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )
        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val partialMatch = assetLibraryService.listAssets(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(search = "폴"),
        )
        val fullMatch = assetLibraryService.listAssets(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(search = "폴리17"),
        )

        assertThat(partialMatch).extracting("id").contains(uploadedAsset.id)
        assertThat(fullMatch).extracting("id").contains(uploadedAsset.id)
    }

    @Test
    fun `matches character alias terms in asset library search`() {
        val character = characterTagRepository.save(
                CharacterTagEntity(
                    name = "코코",
                    normalizedName = "코코",
                    createdByEmail = TEST_ADMIN_EMAIL,
                    updatedByEmail = TEST_ADMIN_EMAIL,
                ),
            )
        characterTagAliasRepository.save(
            CharacterTagAliasEntity(
                characterTag = character,
                value = "cocohero",
                normalizedValue = "cocohero",
            ),
        )

        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "coco-hero-reference.pdf",
                contentType = "application/pdf",
                fileSizeBytes = 5L,
                title = "코코 레퍼런스 문서",
                description = "캐릭터 alias 검색 테스트",
                tags = AssetStructuredTagsRequest(
                    characterTagIds = listOf(requireNotNull(character.id)),
                    keywords = listOf("레퍼런스"),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )

        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val searchedAssets = assetLibraryService.listAssets(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(search = "cocohero"),
        )

        assertThat(searchedAssets).extracting("id").contains(uploadedAsset.id)
    }

    @Test
    fun `updates unused character metadata without requiring existing asset tags`() {
        val createdCharacter = assetTagManagementService.createCharacterTag(
            actorEmail = TEST_ADMIN_EMAIL,
            request = CharacterTagUpsertRequest(
                name = "베키",
                aliases = listOf("beki"),
            ),
        )

        val updatedCharacter = assetTagManagementService.updateCharacterTag(
            actorEmail = TEST_ADMIN_EMAIL,
            characterId = createdCharacter.id,
            request = CharacterTagUpsertRequest(
                name = "베키 리뉴얼",
                aliases = listOf("becky"),
            ),
        )

        assertThat(updatedCharacter.name).isEqualTo("베키 리뉴얼")
        assertThat(updatedCharacter.aliases).containsExactly("becky")
    }

    @Test
    fun `updates character while retaining existing alias values`() {
        val createdCharacter = assetTagManagementService.createCharacterTag(
            actorEmail = TEST_ADMIN_EMAIL,
            request = CharacterTagUpsertRequest(
                name = "베키",
                aliases = listOf("becky", "beki"),
            ),
        )

        val updatedCharacter = assetTagManagementService.updateCharacterTag(
            actorEmail = TEST_ADMIN_EMAIL,
            characterId = createdCharacter.id,
            request = CharacterTagUpsertRequest(
                name = "베키",
                aliases = listOf("becky", "bk"),
            ),
        )

        assertThat(updatedCharacter.aliases).containsExactly("becky", "bk")
    }

    @Test
    fun `refreshes asset search text when character aliases change without renaming character`() {
        val createdCharacter = assetTagManagementService.createCharacterTag(
            actorEmail = TEST_ADMIN_EMAIL,
            request = CharacterTagUpsertRequest(
                name = "베키",
                aliases = listOf("beki"),
            ),
        )

        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "becky-reference.txt",
                contentType = "text/plain",
                fileSizeBytes = 5L,
                title = "베키 레퍼런스",
                description = "캐릭터 alias 갱신 테스트",
                tags = AssetStructuredTagsRequest(
                    characterTagIds = listOf(createdCharacter.id),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )
        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        assetTagManagementService.updateCharacterTag(
            actorEmail = TEST_ADMIN_EMAIL,
            characterId = createdCharacter.id,
            request = CharacterTagUpsertRequest(
                name = "베키",
                aliases = listOf("becky"),
            ),
        )

        val searchedAssets = assetLibraryService.listAssets(
            actorEmail = TEST_CREATOR_EMAIL,
            query = AssetListQuery(search = "becky"),
        )

        assertThat(searchedAssets).extracting("id").contains(uploadedAsset.id)
    }

    @Test
    fun `registers link assets without S3 upload and exposes them in search detail`() {
        val registeredLinks = assetLibraryService.registerLinks(
            request = AssetLinkRegistrationRequest(
                links = listOf(
                    AssetLinkRegistrationItemRequest(
                        url = "youtube.com/watch?v=demo",
                        title = "레퍼런스 영상",
                        linkType = "",
                        tags = AssetStructuredTagsRequest(
                            keywords = listOf("레퍼런스", "영상"),
                        ),
                    ),
                    AssetLinkRegistrationItemRequest(
                        url = "https://drive.google.com/file/d/abc123/view",
                        title = "",
                        linkType = "Google Drive",
                        tags = AssetStructuredTagsRequest(
                            keywords = listOf("시나리오", "최종본"),
                        ),
                    ),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )

        val youtubeAsset = registeredLinks.first { asset -> asset.linkType == "YouTube" }
        val searchedAssets = assetLibraryService.listAssets(
            actorEmail = TEST_REVIEWER_EMAIL,
            query = AssetListQuery(search = "youtube 레퍼런스"),
        )
        val assetDetail = assetLibraryService.getAsset(
            assetId = youtubeAsset.id,
            actorEmail = TEST_REVIEWER_EMAIL,
        )

        assertThat(registeredLinks).hasSize(2)
        assertThat(youtubeAsset.sourceKind).isEqualTo(AssetSourceKind.LINK)
        assertThat(youtubeAsset.type).isEqualTo(AssetType.URL)
        assertThat(youtubeAsset.linkUrl).isEqualTo("https://youtube.com/watch?v=demo")
        assertThat(youtubeAsset.canDownload).isFalse()
        assertThat(searchedAssets).extracting("id").contains(youtubeAsset.id)
        assertThat(assetDetail.currentFile).isNull()
        assertThat(assetDetail.linkUrl).isEqualTo("https://youtube.com/watch?v=demo")
        assertThat(assetDetail.events.first().eventType).isEqualTo(AssetEventType.CREATED)
        verify(assetBinaryStorage, never()).presignUploadUrl(any(), any(), any())
        verify(assetBinaryStorage, never()).store(any(), any(), any())
    }

    @Test
    fun `returns asset detail with history and downloadable file`() {
        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "coco_festival_story.txt",
                contentType = "text/plain",
                fileSizeBytes = 5L,
                title = "코코의 첫 모험 시나리오",
                description = "축제에 가는 이야기 초안",
                tags = AssetStructuredTagsRequest(
                    keywords = listOf("코코", "축제"),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )
        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val assetDetail = assetLibraryService.getAsset(
            assetId = uploadedAsset.id,
            actorEmail = TEST_CREATOR_EMAIL,
        )
        val downloadResult = assetLibraryService.downloadAsset(
            assetId = uploadedAsset.id,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        assertThat(assetDetail.currentFile).isNotNull
        assertThat(assetDetail.currentFile?.originalFileName).isEqualTo("coco_festival_story.txt")
        assertThat(assetDetail.events).hasSize(1)
        assertThat(assetDetail.events.single().eventType).isEqualTo(AssetEventType.CREATED)
        assertThat(assetDetail.tags.keywords).contains("코코", "축제")
        assertThat(assetDetail.canEdit).isTrue()
        assertThat(assetDetail.canDelete).isTrue()
        assertThat(assetDetail.canDownload).isTrue()
        assertThat(downloadResult.fileName).isEqualTo("coco_festival_story.txt")
        assertThat(downloadResult.contentType).isEqualTo("text/plain")
        assertThat(downloadResult.content).containsExactly(*"story".toByteArray())
    }

    @Test
    fun `issues presigned file access urls for download and playback`() {
        val uploadedAsset = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "파일 접근 URL 테스트",
            fileName = "downloadable-video.mp4",
        )

        val downloadAccess = assetLibraryService.issueFileAccessUrl(
            assetId = uploadedAsset.id,
            actorEmail = TEST_REVIEWER_EMAIL,
            mode = AssetFileAccessMode.DOWNLOAD,
        )
        val playbackAccess = assetLibraryService.issueFileAccessUrl(
            assetId = uploadedAsset.id,
            actorEmail = TEST_REVIEWER_EMAIL,
            mode = AssetFileAccessMode.PLAYBACK,
        )

        assertThat(downloadAccess.url).isEqualTo("https://s3.example.com/presigned-download-url")
        assertThat(downloadAccess.fileName).isEqualTo("downloadable-video.mp4")
        assertThat(downloadAccess.mode).isEqualTo(AssetFileAccessMode.DOWNLOAD)
        assertThat(playbackAccess.mode).isEqualTo(AssetFileAccessMode.PLAYBACK)

        verify(assetBinaryStorage).presignDownloadUrl(
            any(),
            any(),
            eq("text/plain"),
            argThat { contains("attachment") },
            any(),
        )
        verify(assetBinaryStorage).presignDownloadUrl(
            any(),
            any(),
            eq("text/plain"),
            argThat { contains("inline") },
            any(),
        )
    }

    @Test
    fun `returns image preview from original asset bytes`() {
        whenever(assetBinaryStorage.load(any(), any())).thenReturn(
            LoadedAssetObject(
                content = byteArrayOf(1, 2, 3),
                contentType = "image/png",
            ),
        )

        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "preview-image.png",
                contentType = "image/png",
                fileSizeBytes = 5L,
                title = "이미지 프리뷰 테스트",
                description = "프리뷰 설명",
                tags = AssetStructuredTagsRequest(
                    keywords = listOf("이미지"),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )
        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val previewResult = assetLibraryService.loadPreview(
            assetId = uploadedAsset.id,
            actorEmail = TEST_REVIEWER_EMAIL,
        )

        assertThat(previewResult.contentType).isEqualTo("image/png")
        assertThat(previewResult.content).containsExactly(1, 2, 3)
    }

    @Test
    fun `returns cached video thumbnail preview from storage`() {
        whenever(assetBinaryStorage.loadOrNull(any(), any())).thenReturn(
            LoadedAssetObject(
                content = byteArrayOf(9, 8, 7),
                contentType = "image/jpeg",
            ),
        )

        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "preview-video.mp4",
                contentType = "video/mp4",
                fileSizeBytes = 12L,
                title = "영상 프리뷰 테스트",
                description = "썸네일 생성",
                tags = AssetStructuredTagsRequest(
                    keywords = listOf("영상"),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )
        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 12L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val previewResult = assetLibraryService.loadPreview(
            assetId = uploadedAsset.id,
            actorEmail = TEST_REVIEWER_EMAIL,
        )

        assertThat(previewResult.contentType).isEqualTo("image/jpeg")
        assertThat(previewResult.content).containsExactly(9, 8, 7)
    }

    @Test
    fun `stores image type metadata and exposes it in detail`() {
        val uploadedAsset = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "축제 배경 이미지",
            fileName = "festival-background.png",
            contentType = "image/png",
            typeMetadata = AssetTypeMetadataRequest(
                imageArtStyle = AssetImageArtStyle.BACKGROUND,
                imageHasLayerFile = true,
            ),
        )

        val assetDetail = assetLibraryService.getAsset(
            assetId = uploadedAsset.id,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        assertThat(uploadedAsset.type).isEqualTo(AssetType.IMAGE)
        assertThat(uploadedAsset.typeMetadata.imageArtStyle).isEqualTo(AssetImageArtStyle.BACKGROUND)
        assertThat(uploadedAsset.typeMetadata.imageHasLayerFile).isTrue()
        assertThat(assetDetail.typeMetadata.imageArtStyle).isEqualTo(AssetImageArtStyle.BACKGROUND)
        assertThat(assetDetail.typeMetadata.imageHasLayerFile).isTrue()
    }

    @Test
    fun `updates video type metadata and records an update history event`() {
        val uploadedAsset = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "영상 세부 정보 에셋",
            fileName = "metadata-video.mp4",
            contentType = "video/mp4",
        )

        val updatedAsset = assetLibraryService.updateAsset(
            assetId = uploadedAsset.id,
            title = "영상 세부 정보 에셋",
            description = "설명",
            requestedTags = AssetStructuredTagsRequest(
                keywords = listOf("태그"),
            ),
            requestedTypeMetadata = AssetTypeMetadataRequest(
                videoStage = AssetVideoStage.FINAL,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )

        assertThat(updatedAsset.typeMetadata.videoStage).isEqualTo(AssetVideoStage.FINAL)
        assertThat(updatedAsset.events).hasSize(2)
        assertThat(updatedAsset.events.first().eventType).isEqualTo(AssetEventType.METADATA_UPDATED)
        assertThat(updatedAsset.events.first().detail).contains("세부 정보")
    }

    @Test
    fun `stores document type metadata and exposes it in detail`() {
        val uploadedAsset = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "축제 기획서",
            fileName = "festival-plan.pdf",
            contentType = "application/pdf",
            typeMetadata = AssetTypeMetadataRequest(
                documentKind = AssetDocumentKind.PLANNING,
            ),
        )

        val assetDetail = assetLibraryService.getAsset(
            assetId = uploadedAsset.id,
            actorEmail = TEST_CREATOR_EMAIL,
        )

        assertThat(uploadedAsset.type).isEqualTo(AssetType.DOCUMENT)
        assertThat(uploadedAsset.typeMetadata.documentKind).isEqualTo(AssetDocumentKind.PLANNING)
        assertThat(assetDetail.typeMetadata.documentKind).isEqualTo(AssetDocumentKind.PLANNING)
    }

    @Test
    fun `updates asset metadata and records an update history event`() {
        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "coco_festival_story.txt",
                contentType = "text/plain",
                fileSizeBytes = 5L,
                title = "코코의 첫 모험 시나리오",
                description = "초기 설명",
                tags = AssetStructuredTagsRequest(
                    keywords = listOf("코코", "축제"),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )
        val uploadedAsset = assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = TEST_CREATOR_EMAIL,
        )

        val updatedAsset = assetLibraryService.updateAsset(
            assetId = uploadedAsset.id,
            title = "코코와 친구들의 축제",
            description = "업데이트된 설명",
            requestedTags = AssetStructuredTagsRequest(
                keywords = listOf("코코", "친구들", "축제"),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )

        assertThat(updatedAsset.title).isEqualTo("코코와 친구들의 축제")
        assertThat(updatedAsset.description).isEqualTo("업데이트된 설명")
        assertThat(updatedAsset.tags.keywords).contains("코코", "친구들", "축제")
        assertThat(updatedAsset.events).hasSize(2)
        assertThat(updatedAsset.events.first().eventType).isEqualTo(AssetEventType.METADATA_UPDATED)
        assertThat(updatedAsset.events.first().detail).contains("제목", "설명", "태그")
    }

    @Test
    fun `soft deletes asset and excludes it from library queries`() {
        val uploadedAsset = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "삭제 테스트 에셋",
            fileName = "delete_test.txt",
        )

        assetLibraryService.deleteAsset(
            assetId = uploadedAsset.id,
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )

        val listedAssets = assetLibraryService.listAssets(actorEmail = TEST_CREATOR_EMAIL)

        assertThat(listedAssets).noneMatch { asset -> asset.id == uploadedAsset.id }
        assertThatThrownBy {
            assetLibraryService.getAsset(
                assetId = uploadedAsset.id,
                actorEmail = TEST_CREATOR_EMAIL,
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("에셋을 찾을 수 없습니다")
    }

    @Test
    fun `rejects delete request from non owner non admin`() {
        val uploadedAsset = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "삭제 권한 테스트 에셋",
            fileName = "delete_permission_test.txt",
        )
        assertThatThrownBy {
            assetLibraryService.deleteAsset(
                assetId = uploadedAsset.id,
                actorEmail = TEST_REVIEWER_EMAIL,
                actorName = "Tony",
            )
        }
            .isInstanceOf(SecurityException::class.java)
            .hasMessageContaining("삭제 권한이 없습니다")
    }

    @Test
    fun `shows all assets to every authenticated user`() {
        val marketingAsset = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "마케팅 전용 에셋",
            fileName = "marketing.txt",
        )
        val contentAsset = uploadAsset(
            actorEmail = TEST_REVIEWER_EMAIL,
            actorName = "Tony",
            title = "콘텐츠 전용 에셋",
            fileName = "content.txt",
        )

        val contentUserVisibleAssets = assetLibraryService.listAssets(actorEmail = TEST_REVIEWER_EMAIL)
        val companyWideVisibleAssets = assetLibraryService.listAssets(actorEmail = TEST_VIEWER_EMAIL)

        assertThat(contentUserVisibleAssets).extracting("id").contains(marketingAsset.id, contentAsset.id)
        assertThat(companyWideVisibleAssets).extracting("id").contains(marketingAsset.id, contentAsset.id)
    }

    @Test
    fun `allows detail and download across organizations`() {
        val uploadedAsset = uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "마케팅 전용 에셋",
            fileName = "marketing-detail.txt",
        )

        val assetDetail = assetLibraryService.getAsset(
            assetId = uploadedAsset.id,
            actorEmail = TEST_REVIEWER_EMAIL,
        )
        val downloadResult = assetLibraryService.downloadAsset(
            assetId = uploadedAsset.id,
            actorEmail = TEST_REVIEWER_EMAIL,
        )

        assertThat(assetDetail.id).isEqualTo(uploadedAsset.id)
        assertThat(downloadResult.fileName).isEqualTo("marketing-detail.txt")
    }

    @Test
    fun `allows company wide viewer export and blocks regular users`() {
        uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "마케팅 에셋",
            fileName = "marketing-export.txt",
        )
        uploadAsset(
            actorEmail = TEST_REVIEWER_EMAIL,
            actorName = "Tony",
            title = "콘텐츠 에셋",
            fileName = "content-export.txt",
        )
        assetLibraryService.registerLinks(
            request = AssetLinkRegistrationRequest(
                links = listOf(
                    AssetLinkRegistrationItemRequest(
                        url = "https://www.notion.so/harmony/demo",
                        title = "노션 링크",
                        tags = AssetStructuredTagsRequest(
                            keywords = listOf("문서"),
                        ),
                    ),
                ),
            ),
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
        )

        val exportResult = assetLibraryService.exportAssets(TEST_VIEWER_EMAIL)

        assertThat(exportResult.contentType).isEqualTo("application/zip")
        assertThat(exportResult.fileName).endsWith(".zip")
        assertThat(exportResult.content).isNotEmpty

        assertThatThrownBy { assetLibraryService.exportAssets(TEST_REVIEWER_EMAIL) }
            .isInstanceOf(SecurityException::class.java)
            .hasMessageContaining("내보내기 권한")
    }

    @Test
    fun `denied asset library feature blocks asset access`() {
        uploadAsset(
            actorEmail = TEST_CREATOR_EMAIL,
            actorName = "Coco",
            title = "권한 테스트 에셋",
            fileName = "permission.txt",
        )
        userDirectoryService.syncLogin(
            email = TEST_RESTRICTED_EMAIL,
            displayName = TEST_RESTRICTED_NAME,
        )
        userFeatureAccessService.saveUserFeatureAccess(
            email = TEST_RESTRICTED_EMAIL,
            allowedFeatureKeys = emptyList(),
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )

        assertThatThrownBy {
            assetLibraryService.listAssets(actorEmail = TEST_RESTRICTED_EMAIL)
        }
            .isInstanceOf(SecurityException::class.java)
            .hasMessageContaining("에셋 라이브러리")
    }

    private fun uploadAsset(
        actorEmail: String,
        actorName: String,
        title: String,
        fileName: String,
        contentType: String = "text/plain",
        requestedTags: AssetStructuredTagsRequest = AssetStructuredTagsRequest(
            keywords = listOf("태그"),
        ),
        typeMetadata: AssetTypeMetadataRequest = AssetTypeMetadataRequest(),
    ): AssetSummaryResponse {
        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = fileName,
                contentType = contentType,
                fileSizeBytes = 5L,
                title = title,
                description = "설명",
                tags = requestedTags,
                typeMetadata = typeMetadata,
            ),
            actorEmail = actorEmail,
            actorName = actorName,
        )
        return assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = actorEmail,
        )
    }
}
