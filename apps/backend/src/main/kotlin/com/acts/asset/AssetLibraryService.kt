package com.acts.asset

import com.acts.asset.event.AssetEventEntity
import com.acts.asset.event.AssetEventRepository
import com.acts.asset.event.AssetEventType
import com.acts.asset.preview.AssetPreviewDispatcher
import com.acts.asset.preview.AssetPreviewResult
import com.acts.asset.preview.VideoPreviewDispatchRequest
import com.acts.asset.storage.AssetBinaryStorage
import com.acts.asset.storage.AssetStorageProperties
import com.acts.asset.storage.CompletedPartInfo
import com.acts.asset.storage.LoadedAssetObject
import com.acts.asset.tag.AssetTagEntity
import com.acts.asset.tag.AssetTagRepository
import com.acts.asset.tag.AssetTagType
import com.acts.asset.tag.AssetSearchTextBuilder
import com.acts.asset.tag.AssetTagSuggestionService
import com.acts.auth.audit.AdminAuditLogService
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import org.springframework.http.ContentDisposition
import org.springframework.stereotype.Service
import java.io.ByteArrayOutputStream
import java.net.URI
import java.text.Normalizer
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@Service
class AssetLibraryService(
    private val adminAuditLogService: AdminAuditLogService,
    private val assetAuthorizationService: AssetAuthorizationService,
    private val assetBinaryStorage: AssetBinaryStorage,
    private val assetEventRepository: AssetEventRepository,
    private val assetFileRepository: AssetFileRepository,
    private val assetMetadataExtractor: AssetMetadataExtractor,
    private val assetPreviewDispatcher: AssetPreviewDispatcher,
    private val assetRepository: AssetRepository,
    private val assetSearchTextBuilder: AssetSearchTextBuilder,
    private val assetStorageProperties: AssetStorageProperties,
    private val assetTagRepository: AssetTagRepository,
    private val assetTagSuggestionService: AssetTagSuggestionService,
    private val assetTypeClassifier: AssetTypeClassifier,
    private val userAccountRepository: UserAccountRepository,
) {
    companion object {
        private const val LINK_MIME_TYPE = "text/uri-list"
        private const val MULTIPART_PART_SIZE: Long = 10L * 1024 * 1024
        private val logger = LoggerFactory.getLogger(AssetLibraryService::class.java)
    }

    @Transactional
    fun initiateUpload(request: AssetUploadIntentRequest, actorEmail: String, actorName: String?): AssetUploadIntentResponse {
        val pending = createPendingAsset(request, actorEmail)
        val presignedUrl = assetBinaryStorage.presignUploadUrl(
            objectKey = pending.objectKey,
            contentType = pending.contentType,
        )

        return AssetUploadIntentResponse(
            assetId = pending.assetId,
            presignedUrl = presignedUrl,
            objectKey = pending.objectKey,
        )
    }

    @Transactional
    fun initiateMultipartUpload(
        request: AssetUploadIntentRequest,
        actorEmail: String,
        actorName: String?,
    ): AssetMultipartUploadIntentResponse {
        val pending = createPendingAsset(request, actorEmail)
        val uploadId = assetBinaryStorage.createMultipartUpload(
            objectKey = pending.objectKey,
            contentType = pending.contentType,
        )

        val partCount = ((request.fileSizeBytes + MULTIPART_PART_SIZE - 1) / MULTIPART_PART_SIZE).toInt()
        val parts = (1..partCount).map { partNumber ->
            PresignedPartUrl(
                partNumber = partNumber,
                presignedUrl = assetBinaryStorage.presignUploadPartUrl(
                    objectKey = pending.objectKey,
                    uploadId = uploadId,
                    partNumber = partNumber,
                ),
            )
        }

        return AssetMultipartUploadIntentResponse(
            assetId = pending.assetId,
            uploadId = uploadId,
            objectKey = pending.objectKey,
            partSize = MULTIPART_PART_SIZE,
            parts = parts,
        )
    }

    @Transactional
    fun completeMultipartUpload(
        assetId: Long,
        request: AssetMultipartUploadCompleteRequest,
        actorEmail: String,
    ): AssetSummaryResponse {
        val (actor, asset, pendingFile) = validateUploadCompletion(assetId, request.objectKey, actorEmail)

        try {
            assetBinaryStorage.completeMultipartUpload(
                objectKey = request.objectKey,
                uploadId = request.uploadId,
                parts = request.parts.map { part ->
                    CompletedPartInfo(
                        partNumber = part.partNumber,
                        eTag = part.eTag,
                    )
                },
            )
        } catch (exception: Exception) {
            logger.error("Failed to complete multipart upload for assetId={} uploadId={}", assetId, request.uploadId, exception)
            assetBinaryStorage.abortMultipartUpload(objectKey = request.objectKey, uploadId = request.uploadId)
            throw IllegalStateException("멀티파트 업로드 완료에 실패했습니다.")
        }

        return finalizeUploadCompletion(
            actor = actor,
            asset = asset,
            pendingFile = pendingFile,
            fileSizeBytes = request.fileSizeBytes,
            widthPx = request.widthPx,
            heightPx = request.heightPx,
        )
    }

    @Transactional
    fun registerLinks(
        request: AssetLinkRegistrationRequest,
        actorEmail: String,
        actorName: String?,
    ): List<AssetSummaryResponse> {
        val actor = requireActor(actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)
        require(request.links.isNotEmpty()) { "등록할 링크가 없습니다." }

        return request.links.map { linkRequest ->
            val resolvedUrl = normalizeLinkUrl(
                linkRequest.url.normalizedOrNull()
                    ?: throw IllegalArgumentException("URL은 비어 있을 수 없습니다."),
            )
            val resolvedHost = extractLinkHost(resolvedUrl)
            val resolvedLinkType = linkRequest.linkType.normalizedOrNull() ?: inferLinkType(resolvedUrl)
            val assetType = assetTypeClassifier.classifyLink(
                url = resolvedUrl,
                linkType = resolvedLinkType,
            )
            val resolvedTitle = linkRequest.title.normalizedOrNull() ?: resolvedHost
            val tags = assetTagSuggestionService.buildTags(linkRequest.tags)

            val asset = AssetEntity(
                title = resolvedTitle,
                assetType = assetType,
                sourceKind = AssetSourceKind.LINK,
                description = null,
                originalFileName = resolvedHost,
                mimeType = LINK_MIME_TYPE,
                fileSizeBytes = 0,
                fileExtension = null,
                linkUrl = resolvedUrl,
                linkType = resolvedLinkType,
                ownerEmail = actor.email,
                ownerName = actor.displayName,
                organization = actor.organization,
                currentVersionNumber = 1,
                searchText = "",
                widthPx = null,
                heightPx = null,
                durationMs = null,
            )
            asset.searchText = assetSearchTextBuilder.buildFromCandidates(asset, tags)
            val savedAsset = assetRepository.save(asset)

            val savedTags = assetTagRepository.saveAll(
                tags.map { tagCandidate ->
                    AssetTagEntity(
                        asset = savedAsset,
                        value = tagCandidate.value,
                        normalizedValue = tagCandidate.normalizedValue,
                        tagType = tagCandidate.tagType,
                        source = tagCandidate.source,
                    )
                },
            )

            assetEventRepository.save(
                AssetEventEntity(
                    asset = savedAsset,
                    eventType = AssetEventType.CREATED,
                    actorEmail = actor.email,
                    actorName = actorName ?: actor.displayName,
                    detail = "외부 링크로 자산이 등록되었습니다.",
                ),
            )

            savedAsset.toSummaryResponse(
                tags = savedTags.toStructuredTagsResponse(),
                permissions = assetAuthorizationService.permissionsFor(actor, savedAsset),
            )
        }
    }

    @Transactional
    fun completeUpload(assetId: Long, request: AssetUploadCompleteRequest, actorEmail: String): AssetSummaryResponse {
        val (actor, asset, pendingFile) = validateUploadCompletion(assetId, request.objectKey, actorEmail)
        require(
            assetBinaryStorage.exists(
                bucket = pendingFile.bucketName,
                objectKey = pendingFile.objectKey,
            ),
        ) { "업로드된 파일을 아직 확인할 수 없습니다." }

        return finalizeUploadCompletion(
            actor = actor,
            asset = asset,
            pendingFile = pendingFile,
            fileSizeBytes = request.fileSizeBytes,
            widthPx = request.widthPx,
            heightPx = request.heightPx,
        )
    }

    @Transactional
    fun listAssets(
        actorEmail: String,
        query: AssetListQuery = AssetListQuery(),
    ): List<AssetSummaryResponse> {
        val actor = requireActor(actorEmail)
        val assets = assetAuthorizationService.filterVisibleAssets(
            actor = actor,
            assets = assetRepository.findAllByDeletedAtIsNullOrderByCreatedAtDescIdDesc(),
        )
        if (assets.isEmpty()) {
            return emptyList()
        }

        val visibleAssets = filterReadyAssets(assets)
            .filter { asset -> asset.matches(query) }
        return buildSummaryResponses(actor, visibleAssets)
    }

    @Transactional
    fun listAssetCatalog(
        actorEmail: String,
        query: AssetListQuery = AssetListQuery(),
        page: Int = 0,
        size: Int = 24,
    ): AssetCatalogPageResponse {
        require(page >= 0) { "페이지 번호는 0 이상이어야 합니다." }
        require(size in 1..100) { "페이지 크기는 1 이상 100 이하여야 합니다." }

        val actor = requireActor(actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)

        val queryResult = assetRepository.findCatalogPage(
            query = query,
            offset = page * size,
            limit = size,
        )
        val totalPages = if (queryResult.totalCount == 0L) {
            0
        } else {
            ((queryResult.totalCount + size - 1) / size).toInt()
        }

        return AssetCatalogPageResponse(
            items = buildSummaryResponses(actor, queryResult.assets),
            page = page,
            size = size,
            totalItems = queryResult.totalCount,
            totalPages = totalPages,
            hasNext = page + 1 < totalPages,
            hasPrevious = page > 0 && totalPages > 0,
        )
    }

    @Transactional
    fun listAssetCatalogFilterOptions(actorEmail: String): AssetCatalogFilterOptionsResponse {
        val actor = requireActor(actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)

        val filterOptions = assetRepository.findCatalogFilterOptions()
        return AssetCatalogFilterOptionsResponse(
            organizations = filterOptions.organizations.map { organization ->
                AssetCatalogOrganizationOptionResponse(
                    id = organization.id,
                    name = organization.name,
                )
            },
            creators = filterOptions.creators.map { creator ->
                AssetCatalogCreatorOptionResponse(
                    email = creator.email,
                    name = creator.name,
                )
            },
        )
    }

    @Transactional
    fun getAsset(
        assetId: Long,
        actorEmail: String,
    ): AssetDetailResponse {
        val actor = requireActor(actorEmail)
        val asset = requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(
            actor = actor,
            asset = asset,
            action = AssetAccessAction.DETAIL_VIEW,
        )
        val currentFile = when (asset.sourceKind) {
            AssetSourceKind.FILE -> assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
                ?: throw IllegalArgumentException("현재 파일 정보를 찾을 수 없습니다.")
            AssetSourceKind.LINK -> null
        }
        val tags = assetTagRepository.findAllByAsset_IdOrderByIdAsc(assetId)
        val events = assetEventRepository.findAllByAsset_IdOrderByCreatedAtDescIdDesc(assetId)
            .map { assetEvent ->
                AssetEventResponse(
                    eventType = assetEvent.eventType,
                    actorEmail = assetEvent.actorEmail,
                    actorName = assetEvent.actorName,
                    detail = assetEvent.detail,
                    createdAt = assetEvent.createdAt,
                )
            }

        return asset.toDetailResponse(
            tags = tags.toStructuredTagsResponse(),
            currentFile = currentFile,
            events = events,
            permissions = assetAuthorizationService.permissionsFor(actor, asset),
        )
    }

    @Transactional
    fun updateAsset(
        assetId: Long,
        title: String,
        description: String?,
        requestedTags: AssetStructuredTagsRequest,
        requestedTypeMetadata: AssetTypeMetadataRequest = AssetTypeMetadataRequest(),
        actorEmail: String,
        actorName: String?,
    ): AssetDetailResponse {
        val actor = requireActor(actorEmail)
        val asset = requireReadyAsset(assetId)
        assetAuthorizationService.requireEditAccess(actor, asset)
        val resolvedTitle = title.normalizedOrNull()
            ?: throw IllegalArgumentException("제목은 비어 있을 수 없습니다.")
        val resolvedDescription = description.normalizedOrNull()
        val nextTags = assetTagSuggestionService.buildTags(requestedTags)
        val previousTags = assetTagRepository.findAllByAsset_IdOrderByIdAsc(assetId)
        val previousState = AssetMetadataSnapshot(
            title = asset.title,
            description = asset.description,
            typeMetadata = asset.toTypeMetadataResponse(),
            tags = previousTags.toStructuredTagsResponse(),
        )
        val resolvedTypeMetadata = resolveTypeMetadata(
            assetType = asset.assetType,
            sourceKind = asset.sourceKind,
            request = requestedTypeMetadata,
        )

        asset.title = resolvedTitle
        asset.description = resolvedDescription
        asset.applyTypeMetadata(resolvedTypeMetadata)
        asset.searchText = assetSearchTextBuilder.buildFromCandidates(asset, nextTags)
        val savedAsset = assetRepository.save(asset)

        assetTagRepository.deleteAllByAsset_Id(assetId)
        assetTagRepository.flush()
        val savedTags = assetTagRepository.saveAll(
            nextTags.map { tagCandidate ->
                AssetTagEntity(
                    asset = asset,
                    value = tagCandidate.value,
                    normalizedValue = tagCandidate.normalizedValue,
                    tagType = tagCandidate.tagType,
                    source = tagCandidate.source,
                )
            },
        )

        val nextState = AssetMetadataSnapshot(
            title = savedAsset.title,
            description = savedAsset.description,
            typeMetadata = savedAsset.toTypeMetadataResponse(),
            tags = savedTags.toStructuredTagsResponse(),
        )

        if (previousState != nextState) {
            assetEventRepository.save(
                AssetEventEntity(
                    asset = savedAsset,
                    eventType = AssetEventType.METADATA_UPDATED,
                    actorEmail = actor.email,
                    actorName = actorName ?: actor.displayName,
                    detail = buildMetadataUpdateDetail(previousState, nextState),
                ),
            )
        }

        return getAsset(
            assetId = assetId,
            actorEmail = actor.email,
        )
    }

    @Transactional
    fun loadPreview(
        assetId: Long,
        actorEmail: String,
    ): AssetPreviewResult {
        val actor = requireActor(actorEmail)
        val asset = requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(
            actor = actor,
            asset = asset,
            action = AssetAccessAction.DETAIL_VIEW,
        )
        require(asset.sourceKind == AssetSourceKind.FILE) { "링크 자산은 프리뷰를 지원하지 않습니다." }
        val currentFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("프리뷰 대상 파일을 찾을 수 없습니다.")

        val previewObject = when (asset.assetType) {
            AssetType.IMAGE -> if (
                assetBinaryStorage.exists(
                    bucket = currentFile.bucketName,
                    objectKey = currentFile.objectKey,
                )
            ) {
                assetBinaryStorage.load(
                    bucket = currentFile.bucketName,
                    objectKey = currentFile.objectKey,
                )
            } else {
                null
            }
            AssetType.VIDEO -> loadGeneratedVideoPreview(currentFile)
            else -> null
        } ?: throw IllegalArgumentException("프리뷰 대상 파일을 찾을 수 없습니다.")

        return AssetPreviewResult(
            content = previewObject.content,
            contentType = previewObject.contentType ?: "application/octet-stream",
        )
    }

    @Transactional
    fun downloadAsset(
        assetId: Long,
        actorEmail: String,
    ): AssetDownloadResult {
        val actor = requireActor(actorEmail)
        val asset = requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(
            actor = actor,
            asset = asset,
            action = AssetAccessAction.DOWNLOAD,
        )
        require(asset.sourceKind == AssetSourceKind.FILE) { "링크 자산은 다운로드할 수 없습니다." }
        val currentFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("다운로드할 파일을 찾을 수 없습니다.")
        require(
            assetBinaryStorage.exists(
                bucket = currentFile.bucketName,
                objectKey = currentFile.objectKey,
            ),
        ) { "다운로드할 파일을 찾을 수 없습니다." }
        val loadedAssetObject = assetBinaryStorage.load(
            bucket = currentFile.bucketName,
            objectKey = currentFile.objectKey,
        )

        return AssetDownloadResult(
            content = loadedAssetObject.content,
            contentType = loadedAssetObject.contentType ?: currentFile.mimeType,
            fileName = currentFile.originalFileName,
        )
    }

    @Transactional
    fun issueFileAccessUrl(
        assetId: Long,
        actorEmail: String,
        mode: AssetFileAccessMode,
    ): AssetFileAccessUrlResponse {
        val actor = requireActor(actorEmail)
        val asset = requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(
            actor = actor,
            asset = asset,
            action = AssetAccessAction.DOWNLOAD,
        )
        require(asset.sourceKind == AssetSourceKind.FILE) { "링크 자산은 파일 접근 URL을 발급할 수 없습니다." }

        val currentFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("다운로드할 파일을 찾을 수 없습니다.")
        require(
            assetBinaryStorage.exists(
                bucket = currentFile.bucketName,
                objectKey = currentFile.objectKey,
            ),
        ) { "다운로드할 파일을 찾을 수 없습니다." }
        val expirationMinutes = assetStorageProperties.accessUrlExpirationMinutes
        val contentDisposition = when (mode) {
            AssetFileAccessMode.DOWNLOAD -> ContentDisposition.attachment()
            AssetFileAccessMode.PLAYBACK -> ContentDisposition.inline()
        }
            .filename(currentFile.originalFileName, StandardCharsets.UTF_8)
            .build()
            .toString()

        return AssetFileAccessUrlResponse(
            url = assetBinaryStorage.presignDownloadUrl(
                bucket = currentFile.bucketName,
                objectKey = currentFile.objectKey,
                contentType = currentFile.mimeType,
                contentDisposition = contentDisposition,
                expirationMinutes = expirationMinutes,
            ),
            fileName = currentFile.originalFileName,
            contentType = currentFile.mimeType,
            expiresAt = Instant.now().plusSeconds(expirationMinutes * 60),
            mode = mode,
        )
    }

    @Transactional
    fun deleteAsset(
        assetId: Long,
        actorEmail: String,
        actorName: String?,
    ) {
        val actor = requireActor(actorEmail)
        val asset = requireReadyAsset(assetId)
        assetAuthorizationService.requireDeleteAccess(actor, asset)

        asset.deletedAt = Instant.now()
        asset.deletedByEmail = actor.email
        asset.deletedByName = actorName ?: actor.displayName
        assetRepository.save(asset)

        assetEventRepository.save(
            AssetEventEntity(
                asset = asset,
                eventType = AssetEventType.DELETED,
                actorEmail = actor.email,
                actorName = actorName ?: actor.displayName,
                detail = "자산이 삭제되었습니다.",
            ),
        )
    }

    @Transactional
    fun exportAssets(actorEmail: String): AssetDownloadResult {
        val actor = requireActor(actorEmail)
        assetAuthorizationService.requireExportAllAccess(actor)

        val assets = assetAuthorizationService.filterVisibleAssets(
            actor = actor,
            assets = assetRepository.findAllByDeletedAtIsNullOrderByCreatedAtDescIdDesc(),
        )
        val readyAssets = filterReadyAssets(assets)
        val assetIds = readyAssets.mapNotNull { asset -> asset.id }
        val currentFilesByAssetId = if (assetIds.isEmpty()) {
            emptyMap<Long, AssetFileEntity>()
        } else {
            assetFileRepository.findAllByAsset_IdInOrderByAsset_IdAscVersionNumberDescIdDesc(assetIds)
                .groupBy { assetFile -> requireNotNull(assetFile.asset.id) }
                .mapValues { (_, files) -> files.first() }
        }

        val zipContent = ByteArrayOutputStream().use { buffer ->
            ZipOutputStream(buffer).use { zipOutputStream ->
                readyAssets.forEach { asset ->
                    if (asset.sourceKind == AssetSourceKind.LINK) {
                        zipOutputStream.putNextEntry(
                            ZipEntry(
                                buildExportEntryName(
                                    asset,
                                    "${asset.title}-link.txt",
                                ),
                            ),
                        )
                        zipOutputStream.write(buildLinkExportContent(asset).toByteArray())
                        zipOutputStream.closeEntry()
                        return@forEach
                    }

                    val assetId = requireNotNull(asset.id)
                    val currentFile = currentFilesByAssetId[assetId]
                        ?: throw IllegalArgumentException("내보낼 파일 정보를 찾을 수 없습니다.")
                    require(
                        assetBinaryStorage.exists(
                            bucket = currentFile.bucketName,
                            objectKey = currentFile.objectKey,
                        ),
                    ) { "내보낼 파일 정보를 찾을 수 없습니다." }
                    val loadedAssetObject = assetBinaryStorage.load(
                        bucket = currentFile.bucketName,
                        objectKey = currentFile.objectKey,
                    )
                    zipOutputStream.putNextEntry(ZipEntry(buildExportEntryName(asset, currentFile.originalFileName)))
                    zipOutputStream.write(loadedAssetObject.content)
                    zipOutputStream.closeEntry()
                }
            }
            buffer.toByteArray()
        }

        adminAuditLogService.recordAssetExported(
            actorEmail = actor.email,
            actorName = actor.displayName,
            exportedAssetCount = readyAssets.size,
        )

        return AssetDownloadResult(
            content = zipContent,
            contentType = "application/zip",
            fileName = buildExportFileName(),
        )
    }

    private fun createPendingAsset(
        request: AssetUploadIntentRequest,
        actorEmail: String,
    ): PendingAssetResult {
        val actor = requireActor(actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)

        val resolvedFileName = normalizeText(request.fileName).trim()
        val contentType = request.contentType.normalizedOrNull() ?: "application/octet-stream"
        val resolvedTitle = request.title.normalizedOrNull() ?: resolvedFileName.substringBeforeLast(".", resolvedFileName)
        val resolvedDescription = request.description.normalizedOrNull()
        val assetType = assetTypeClassifier.classify(fileName = resolvedFileName, contentType = contentType)
        val tags = assetTagSuggestionService.buildTags(request.tags)
        val requestedTypeMetadata = if (
            assetType == AssetType.DOCUMENT &&
            request.typeMetadata.documentKind == null
        ) {
            request.typeMetadata.copy(
                documentKind = assetTypeClassifier.inferDocumentKind(
                    fileName = resolvedFileName,
                    contentType = contentType,
                ),
            )
        } else {
            request.typeMetadata
        }
        val resolvedTypeMetadata = resolveTypeMetadata(
            assetType = assetType,
            sourceKind = AssetSourceKind.FILE,
            request = requestedTypeMetadata,
        )
        val objectKey = createObjectKey(resolvedFileName)

        val asset = AssetEntity(
            title = resolvedTitle,
            assetType = assetType,
            sourceKind = AssetSourceKind.FILE,
            description = resolvedDescription,
            originalFileName = resolvedFileName,
            mimeType = contentType,
            fileSizeBytes = request.fileSizeBytes,
            fileExtension = resolvedFileName.substringAfterLast(".", "").normalizedOrNull(),
            linkUrl = null,
            linkType = null,
            ownerEmail = actor.email,
            ownerName = actor.displayName,
            organization = actor.organization,
            currentVersionNumber = 1,
            searchText = "",
            widthPx = null,
            heightPx = null,
            durationMs = null,
            imageArtStyle = resolvedTypeMetadata.imageArtStyle,
            imageHasLayerFile = resolvedTypeMetadata.imageHasLayerFile,
            audioTtsVoice = resolvedTypeMetadata.audioTtsVoice,
            audioRecordingType = resolvedTypeMetadata.audioRecordingType,
            videoStage = resolvedTypeMetadata.videoStage,
            documentKind = resolvedTypeMetadata.documentKind,
        )
        asset.searchText = assetSearchTextBuilder.buildFromCandidates(asset, tags)
        val savedAsset = assetRepository.save(asset)

        assetTagRepository.saveAll(
            tags.map { tagCandidate ->
                AssetTagEntity(
                    asset = savedAsset,
                    value = tagCandidate.value,
                    normalizedValue = tagCandidate.normalizedValue,
                    tagType = tagCandidate.tagType,
                    source = tagCandidate.source,
                )
            },
        )

        assetFileRepository.save(
            AssetFileEntity(
                asset = savedAsset,
                versionNumber = 1,
                bucketName = assetStorageProperties.bucket,
                objectKey = objectKey,
                originalFileName = resolvedFileName,
                mimeType = contentType,
                fileSizeBytes = request.fileSizeBytes,
                checksumSha256 = null,
                createdByEmail = actor.email,
                createdByName = actor.displayName,
            ),
        )

        return PendingAssetResult(
            assetId = requireNotNull(savedAsset.id),
            objectKey = objectKey,
            contentType = contentType,
        )
    }

    private fun validateUploadCompletion(
        assetId: Long,
        objectKey: String,
        actorEmail: String,
    ): UploadCompletionContext {
        val actor = requireActor(actorEmail)
        val asset = assetRepository.findById(assetId)
            .orElseThrow { IllegalArgumentException("자산을 찾을 수 없습니다.") }

        require(asset.sourceKind == AssetSourceKind.FILE) { "파일 업로드 자산이 아닙니다." }
        require(asset.ownerEmail == actor.email) { "자산 소유자만 업로드를 완료할 수 있습니다." }

        val pendingFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("업로드 대상 파일 정보를 찾을 수 없습니다.")
        require(pendingFile.objectKey == objectKey) { "업로드 대상 파일이 일치하지 않습니다." }
        require(!assetEventRepository.existsByAsset_IdAndEventType(assetId, AssetEventType.CREATED)) {
            "이미 업로드 완료 처리된 자산입니다."
        }

        return UploadCompletionContext(actor = actor, asset = asset, pendingFile = pendingFile)
    }

    private fun finalizeUploadCompletion(
        actor: com.acts.auth.user.UserAccountEntity,
        asset: AssetEntity,
        pendingFile: AssetFileEntity,
        fileSizeBytes: Long,
        widthPx: Int?,
        heightPx: Int?,
    ): AssetSummaryResponse {
        asset.fileSizeBytes = fileSizeBytes
        asset.widthPx = widthPx
        asset.heightPx = heightPx
        assetRepository.save(asset)

        pendingFile.fileSizeBytes = fileSizeBytes
        assetFileRepository.save(pendingFile)

        assetEventRepository.save(
            AssetEventEntity(
                asset = asset,
                eventType = AssetEventType.CREATED,
                actorEmail = actor.email,
                actorName = actor.displayName,
                detail = "파일 업로드로 자산이 등록되었습니다.",
            ),
        )
        assetEventRepository.flush()
        requestVideoPreviewGenerationIfNeeded(asset.assetType, pendingFile)

        val assetId = requireNotNull(asset.id)
        val tags = assetTagRepository.findAllByAsset_IdOrderByIdAsc(assetId)
        return asset.toSummaryResponse(
            tags = tags.toStructuredTagsResponse(),
            permissions = assetAuthorizationService.permissionsFor(actor, asset),
        )
    }

    private fun AssetEntity.matches(query: AssetListQuery): Boolean {
        val normalizedSearchTerms = query.normalizedSearchTerms()
        if (normalizedSearchTerms.any { searchTerm -> !searchText.contains(searchTerm) }) {
            return false
        }

        if (query.assetType != null && assetType != query.assetType) {
            return false
        }

        if (query.organizationId != null && organization?.id != query.organizationId) {
            return false
        }

        if (query.normalizedCreatorEmail() != null && !ownerEmail.equals(query.normalizedCreatorEmail(), ignoreCase = true)) {
            return false
        }

        if (query.imageArtStyle != null && imageArtStyle != query.imageArtStyle) {
            return false
        }

        if (query.imageHasLayerFile != null && imageHasLayerFile != query.imageHasLayerFile) {
            return false
        }

        if (
            query.normalizedAudioTtsVoice() != null &&
            !(audioTtsVoice?.lowercase()?.contains(query.normalizedAudioTtsVoice()!!) ?: false)
        ) {
            return false
        }

        if (query.audioRecordingType != null && audioRecordingType != query.audioRecordingType) {
            return false
        }

        if (query.videoStage != null && videoStage != query.videoStage) {
            return false
        }

        if (query.documentKind != null && documentKind != query.documentKind) {
            return false
        }

        return true
    }

    private fun requireActiveAsset(assetId: Long): AssetEntity = assetRepository.findByIdAndDeletedAtIsNull(assetId)
        ?: throw IllegalArgumentException("자산을 찾을 수 없습니다.")

    private fun requireReadyAsset(assetId: Long): AssetEntity {
        val asset = requireActiveAsset(assetId)
        require(isReadyAsset(asset)) { "자산을 찾을 수 없습니다." }
        return asset
    }

    private fun filterReadyAssets(assets: List<AssetEntity>): List<AssetEntity> {
        if (assets.isEmpty()) {
            return emptyList()
        }

        val fileAssetIds = assets
            .filter { asset -> asset.sourceKind == AssetSourceKind.FILE }
            .mapNotNull { asset -> asset.id }
        if (fileAssetIds.isEmpty()) {
            return assets
        }

        val completedAssetIds = assetEventRepository.findAllByAsset_IdInAndEventType(fileAssetIds, AssetEventType.CREATED)
            .mapNotNull { event -> event.asset.id }
            .toSet()

        return assets.filter { asset ->
            asset.sourceKind == AssetSourceKind.LINK || asset.id in completedAssetIds
        }
    }

    private fun isReadyAsset(asset: AssetEntity): Boolean = when (asset.sourceKind) {
        AssetSourceKind.LINK -> true
        AssetSourceKind.FILE -> assetEventRepository.existsByAsset_IdAndEventType(
            requireNotNull(asset.id),
            AssetEventType.CREATED,
        )
    }

    private fun requireActor(actorEmail: String) = userAccountRepository.findById(actorEmail.lowercase())
        .orElseThrow { IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.") }

    private fun buildSummaryResponses(
        actor: com.acts.auth.user.UserAccountEntity,
        assets: List<AssetEntity>,
    ): List<AssetSummaryResponse> {
        if (assets.isEmpty()) {
            return emptyList()
        }

        val tagsByAssetId = assetTagRepository.findAllByAssetIds(assets.mapNotNull { asset -> asset.id })
            .groupBy { assetTag -> requireNotNull(assetTag.asset.id) }

        return assets.map { asset ->
            asset.toSummaryResponse(
                tags = tagsByAssetId[asset.id].orEmpty().toStructuredTagsResponse(),
                permissions = assetAuthorizationService.permissionsFor(actor, asset),
            )
        }
    }

    private fun AssetEntity.toSummaryResponse(
        tags: AssetStructuredTagsResponse,
        permissions: AssetPermissionSnapshot,
    ): AssetSummaryResponse = AssetSummaryResponse(
        id = requireNotNull(id),
        title = title,
        type = assetType,
        sourceKind = sourceKind,
        description = description,
        originalFileName = originalFileName,
        mimeType = mimeType,
        fileSizeBytes = fileSizeBytes,
        fileExtension = fileExtension,
        linkUrl = linkUrl,
        linkType = linkType,
        versionNumber = currentVersionNumber,
        ownerEmail = ownerEmail,
        ownerName = ownerName,
        organizationId = organization?.id,
        organizationName = organization?.name,
        widthPx = widthPx,
        heightPx = heightPx,
        durationMs = durationMs,
        typeMetadata = toTypeMetadataResponse(),
        tags = tags,
        searchText = searchText,
        canEdit = permissions.canEdit,
        canDelete = permissions.canDelete,
        canDownload = permissions.canDownload,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

    private fun AssetEntity.toDetailResponse(
        tags: AssetStructuredTagsResponse,
        currentFile: AssetFileEntity?,
        events: List<AssetEventResponse>,
        permissions: AssetPermissionSnapshot,
    ): AssetDetailResponse = AssetDetailResponse(
        id = requireNotNull(id),
        title = title,
        type = assetType,
        sourceKind = sourceKind,
        description = description,
        originalFileName = originalFileName,
        mimeType = mimeType,
        fileSizeBytes = fileSizeBytes,
        fileExtension = fileExtension,
        linkUrl = linkUrl,
        linkType = linkType,
        versionNumber = currentVersionNumber,
        ownerEmail = ownerEmail,
        ownerName = ownerName,
        organizationId = organization?.id,
        organizationName = organization?.name,
        widthPx = widthPx,
        heightPx = heightPx,
        durationMs = durationMs,
        typeMetadata = toTypeMetadataResponse(),
        tags = tags,
        searchText = searchText,
        canEdit = permissions.canEdit,
        canDelete = permissions.canDelete,
        canDownload = permissions.canDownload,
        createdAt = createdAt,
        updatedAt = updatedAt,
        currentFile = currentFile?.let { resolvedCurrentFile ->
            AssetFileResponse(
                bucketName = resolvedCurrentFile.bucketName,
                objectKey = resolvedCurrentFile.objectKey,
                originalFileName = resolvedCurrentFile.originalFileName,
                mimeType = resolvedCurrentFile.mimeType,
                fileSizeBytes = resolvedCurrentFile.fileSizeBytes,
                checksumSha256 = resolvedCurrentFile.checksumSha256,
                versionNumber = resolvedCurrentFile.versionNumber,
                createdByEmail = resolvedCurrentFile.createdByEmail,
                createdByName = resolvedCurrentFile.createdByName,
                createdAt = resolvedCurrentFile.createdAt,
            )
        },
        events = events,
    )

    private fun AssetEntity.toTypeMetadataResponse(): AssetTypeMetadataResponse = AssetTypeMetadataResponse(
        imageArtStyle = imageArtStyle,
        imageHasLayerFile = imageHasLayerFile,
        audioTtsVoice = audioTtsVoice,
        audioRecordingType = audioRecordingType,
        videoStage = videoStage,
        documentKind = documentKind,
    )

    private fun AssetEntity.applyTypeMetadata(typeMetadata: AssetTypeMetadataResponse) {
        imageArtStyle = typeMetadata.imageArtStyle
        imageHasLayerFile = typeMetadata.imageHasLayerFile
        audioTtsVoice = typeMetadata.audioTtsVoice
        audioRecordingType = typeMetadata.audioRecordingType
        videoStage = typeMetadata.videoStage
        documentKind = typeMetadata.documentKind
    }

    private fun createObjectKey(fileName: String): String {
        val timestampPrefix = DateTimeFormatter.ofPattern("yyyy/MM/dd", Locale.US)
            .withZone(ZoneOffset.UTC)
            .format(Instant.now())

        return "assets/$timestampPrefix/${UUID.randomUUID()}-${sanitizeFileName(fileName)}"
    }

    private fun List<AssetTagEntity>.toStructuredTagsResponse(): AssetStructuredTagsResponse = AssetStructuredTagsResponse(
        characters = filter { tag -> tag.tagType == AssetTagType.CHARACTER }.map { tag -> tag.value },
        locations = filter { tag -> tag.tagType == AssetTagType.LOCATION }.map { tag -> tag.value },
        keywords = filter { tag -> tag.tagType == AssetTagType.KEYWORD }.map { tag -> tag.value },
    )

    private fun createPreviewObjectKey(objectKey: String): String = "$objectKey.preview.jpg"

    private fun resolveTypeMetadata(
        assetType: AssetType,
        sourceKind: AssetSourceKind,
        request: AssetTypeMetadataRequest,
    ): AssetTypeMetadataResponse {
        val normalizedAudioTtsVoice = request.audioTtsVoice.normalizedOrNull()

        return when {
            sourceKind != AssetSourceKind.FILE -> {
                require(!request.hasAnyValue(normalizedAudioTtsVoice)) { "링크 자산에는 파일 세부 정보를 저장할 수 없습니다." }
                AssetTypeMetadataResponse()
            }

            assetType == AssetType.IMAGE -> {
                require(
                    request.audioRecordingType == null &&
                        normalizedAudioTtsVoice == null &&
                        request.videoStage == null &&
                        request.documentKind == null,
                ) {
                    "이미지 자산에는 이미지 세부 정보만 저장할 수 있습니다."
                }
                AssetTypeMetadataResponse(
                    imageArtStyle = request.imageArtStyle,
                    imageHasLayerFile = request.imageHasLayerFile ?: false,
                )
            }

            assetType == AssetType.AUDIO -> {
                require(
                    request.imageArtStyle == null &&
                        request.imageHasLayerFile == null &&
                        request.videoStage == null &&
                        request.documentKind == null,
                ) {
                    "오디오 자산에는 오디오 세부 정보만 저장할 수 있습니다."
                }
                AssetTypeMetadataResponse(
                    audioTtsVoice = normalizedAudioTtsVoice,
                    audioRecordingType = request.audioRecordingType,
                )
            }

            assetType == AssetType.VIDEO -> {
                require(
                    request.imageArtStyle == null &&
                        request.imageHasLayerFile == null &&
                        normalizedAudioTtsVoice == null &&
                        request.audioRecordingType == null &&
                        request.documentKind == null,
                ) {
                    "영상 자산에는 영상 세부 정보만 저장할 수 있습니다."
                }
                AssetTypeMetadataResponse(
                    videoStage = request.videoStage,
                )
            }

            assetType == AssetType.DOCUMENT -> {
                require(
                    request.imageArtStyle == null &&
                        request.imageHasLayerFile == null &&
                        normalizedAudioTtsVoice == null &&
                        request.audioRecordingType == null &&
                        request.videoStage == null,
                ) {
                    "문서 자산에는 문서 세부 정보만 저장할 수 있습니다."
                }
                AssetTypeMetadataResponse(
                    documentKind = request.documentKind,
                )
            }

            else -> {
                require(!request.hasAnyValue(normalizedAudioTtsVoice)) { "이 자산 유형은 추가 파일 세부 정보를 지원하지 않습니다." }
                AssetTypeMetadataResponse()
            }
        }
    }

    private fun sanitizeFileName(fileName: String): String = fileName
        .trim()
        .replace(Regex("[^\\p{L}\\p{N}._-]+"), "-")
        .replace(Regex("-+"), "-")
        .trim('-')
        .ifBlank { "asset" }

    private fun buildMetadataUpdateDetail(
        previousState: AssetMetadataSnapshot,
        nextState: AssetMetadataSnapshot,
    ): String {
        val changedFields = buildList {
            if (previousState.title != nextState.title) {
                add("제목")
            }
            if (previousState.description != nextState.description) {
                add("설명")
            }
            if (previousState.typeMetadata != nextState.typeMetadata) {
                add("세부 정보")
            }
            if (previousState.tags != nextState.tags) {
                add("태그")
            }
        }

        return if (changedFields.isEmpty()) {
            "메타데이터가 다시 저장되었습니다."
        } else {
            "${changedFields.joinToString(", ")} 정보가 업데이트되었습니다."
        }
    }

    private fun buildExportEntryName(asset: AssetEntity, originalFileName: String): String {
        val organizationSegment = sanitizeFileName(asset.organization?.name ?: "org-unassigned")
        val fileNameSegment = sanitizeFileName(originalFileName)
        return "$organizationSegment/${requireNotNull(asset.id)}-$fileNameSegment"
    }

    private fun buildExportFileName(): String {
        val timestamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss", Locale.US)
            .withZone(ZoneOffset.UTC)
            .format(Instant.now())
        return "acts-assets-export-$timestamp.zip"
    }

    private fun buildLinkExportContent(asset: AssetEntity): String = buildString {
        appendLine("title: ${asset.title}")
        appendLine("linkType: ${asset.linkType ?: "기타"}")
        appendLine("url: ${asset.linkUrl ?: ""}")
    }

    private fun requestVideoPreviewGenerationIfNeeded(
        assetType: AssetType,
        currentFile: AssetFileEntity,
    ) {
        if (assetType != AssetType.VIDEO) {
            return
        }

        val request = VideoPreviewDispatchRequest(
            bucket = currentFile.bucketName,
            objectKey = currentFile.objectKey,
            previewObjectKey = createPreviewObjectKey(currentFile.objectKey),
            originalFileName = currentFile.originalFileName,
        )

        CompletableFuture.runAsync {
            runCatching {
                assetPreviewDispatcher.requestVideoPreview(request)
            }.onFailure { exception ->
                logger.warn(
                    "Failed to dispatch video preview generation for asset file {}.",
                    request.objectKey,
                    exception,
                )
            }
        }
    }

    private fun loadGeneratedVideoPreview(currentFile: AssetFileEntity): LoadedAssetObject? {
        val previewObjectKey = createPreviewObjectKey(currentFile.objectKey)
        val cachedPreview = assetBinaryStorage.loadOrNull(
            bucket = currentFile.bucketName,
            objectKey = previewObjectKey,
        )
        if (cachedPreview != null) {
            return cachedPreview
        }

        requestVideoPreviewGenerationIfNeeded(AssetType.VIDEO, currentFile)
        return null
    }

    private fun String?.normalizedOrNull(): String? = this
        ?.let(::normalizeText)
        ?.trim()
        ?.takeIf { value -> value.isNotEmpty() }

    private fun normalizeLinkUrl(value: String): String {
        val candidate = if (value.contains("://")) value else "https://$value"

        return try {
            val uri = URI.create(candidate)
            require(!uri.host.isNullOrBlank()) { "올바른 URL을 입력해 주세요." }
            uri.normalize().toString()
        } catch (_: IllegalArgumentException) {
            throw IllegalArgumentException("올바른 URL을 입력해 주세요.")
        }
    }

    private fun extractLinkHost(url: String): String = try {
        URI.create(url).host
            ?.removePrefix("www.")
            ?.lowercase()
            ?.takeIf { host -> host.isNotBlank() }
            ?: url
    } catch (_: IllegalArgumentException) {
        url
    }

    private fun inferLinkType(url: String): String {
        val host = extractLinkHost(url)

        return when {
            host.contains("drive.google.com") || host.contains("docs.google.com") -> "Google Drive"
            host.contains("youtube.com") || host.contains("youtu.be") -> "YouTube"
            host.contains("notion.so") || host.contains("notion.site") -> "Notion"
            else -> host
        }
    }

    private fun normalizeText(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFC)
}

private data class AssetMetadataSnapshot(
    val title: String,
    val description: String?,
    val typeMetadata: AssetTypeMetadataResponse,
    val tags: AssetStructuredTagsResponse,
)

private fun AssetTypeMetadataRequest.hasAnyValue(normalizedAudioTtsVoice: String?): Boolean = imageArtStyle != null ||
    imageHasLayerFile != null ||
    normalizedAudioTtsVoice != null ||
    audioRecordingType != null ||
    videoStage != null ||
    documentKind != null

private data class PendingAssetResult(
    val assetId: Long,
    val objectKey: String,
    val contentType: String,
)

private data class UploadCompletionContext(
    val actor: com.acts.auth.user.UserAccountEntity,
    val asset: AssetEntity,
    val pendingFile: AssetFileEntity,
)
