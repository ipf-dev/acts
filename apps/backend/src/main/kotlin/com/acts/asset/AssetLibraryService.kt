package com.acts.asset

import com.acts.asset.event.AssetEventEntity
import com.acts.asset.event.AssetEventRepository
import com.acts.asset.event.AssetEventType
import com.acts.asset.preview.AssetPreviewGenerator
import com.acts.asset.preview.AssetPreviewResult
import com.acts.asset.storage.AssetBinaryStorage
import com.acts.asset.storage.AssetStorageProperties
import com.acts.asset.storage.LoadedAssetObject
import com.acts.asset.tag.AssetTagEntity
import com.acts.asset.tag.AssetTagRepository
import com.acts.asset.tag.AssetTagType
import com.acts.asset.tag.AssetSearchTextBuilder
import com.acts.asset.tag.AssetTagSuggestionService
import com.acts.auth.audit.AdminAuditLogService
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
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
    private val assetPreviewGenerator: AssetPreviewGenerator,
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
    }

    @Transactional
    fun initiateUpload(request: AssetUploadIntentRequest, actorEmail: String, actorName: String?): AssetUploadIntentResponse {
        val actor = requireActor(actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)

        val resolvedFileName = normalizeText(request.fileName).trim()
        val contentType = request.contentType.normalizedOrNull() ?: "application/octet-stream"
        val resolvedTitle = request.title.normalizedOrNull() ?: resolvedFileName.substringBeforeLast(".", resolvedFileName)
        val resolvedDescription = request.description.normalizedOrNull()
        val assetType = assetTypeClassifier.classify(fileName = resolvedFileName, contentType = contentType)
        val tags = assetTagSuggestionService.buildTags(request.tags)
        val objectKey = createObjectKey(resolvedFileName)
        val presignedUrl = assetBinaryStorage.presignUploadUrl(
            objectKey = objectKey,
            contentType = contentType,
        )

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

        return AssetUploadIntentResponse(
            assetId = requireNotNull(savedAsset.id),
            presignedUrl = presignedUrl,
            objectKey = objectKey,
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
        val actor = requireActor(actorEmail)
        val asset = assetRepository.findById(assetId)
            .orElseThrow { IllegalArgumentException("자산을 찾을 수 없습니다.") }

        require(asset.sourceKind == AssetSourceKind.FILE) { "파일 업로드 자산이 아닙니다." }
        require(asset.ownerEmail == actor.email) { "자산 소유자만 업로드를 완료할 수 있습니다." }

        val pendingFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("업로드 대상 파일 정보를 찾을 수 없습니다.")
        require(pendingFile.objectKey == request.objectKey) { "업로드 대상 파일이 일치하지 않습니다." }
        require(!assetEventRepository.existsByAsset_IdAndEventType(assetId, AssetEventType.CREATED)) {
            "이미 업로드 완료 처리된 자산입니다."
        }
        require(
            assetBinaryStorage.exists(
                bucket = pendingFile.bucketName,
                objectKey = pendingFile.objectKey,
            ),
        ) { "업로드된 파일을 아직 확인할 수 없습니다." }

        asset.fileSizeBytes = request.fileSizeBytes
        asset.widthPx = request.widthPx
        asset.heightPx = request.heightPx
        assetRepository.save(asset)

        pendingFile.fileSizeBytes = request.fileSizeBytes
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

        val tags = assetTagRepository.findAllByAsset_IdOrderByIdAsc(assetId)
        return asset.toSummaryResponse(
            tags = tags.toStructuredTagsResponse(),
            permissions = assetAuthorizationService.permissionsFor(actor, asset),
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
        if (visibleAssets.isEmpty()) {
            return emptyList()
        }

        val assetIds = visibleAssets.mapNotNull { asset -> asset.id }
        val tagsByAssetId = assetTagRepository.findAllByAssetIds(assetIds)
            .groupBy { assetTag -> requireNotNull(assetTag.asset.id) }

        return visibleAssets
            .map { asset ->
                asset.toSummaryResponse(
                    tags = tagsByAssetId[asset.id].orEmpty().toStructuredTagsResponse(),
                    permissions = assetAuthorizationService.permissionsFor(actor, asset),
                )
            }
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
            tags = previousTags.toStructuredTagsResponse(),
        )

        asset.title = resolvedTitle
        asset.description = resolvedDescription
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
            AssetType.VIDEO -> loadOrGenerateVideoPreview(currentFile)
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

    private fun AssetEntity.matches(query: AssetListQuery): Boolean {
        val normalizedSearchTerms = query.search.normalizedSearchTerms()
        if (normalizedSearchTerms.any { searchTerm -> !searchText.contains(searchTerm) }) {
            return false
        }

        if (query.assetType != null && assetType != query.assetType) {
            return false
        }

        if (query.organizationId != null && organization?.id != query.organizationId) {
            return false
        }

        if (query.creatorEmail != null && !ownerEmail.equals(query.creatorEmail, ignoreCase = true)) {
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

    private fun storeGeneratedPreviewIfNeeded(
        assetType: AssetType,
        objectKey: String,
        originalFileName: String,
        contentBytes: ByteArray,
    ) {
        if (assetType != AssetType.VIDEO) {
            return
        }

        val generatedPreview = assetPreviewGenerator.generateVideoPreview(
            originalFileName = originalFileName,
            contentBytes = contentBytes,
        ) ?: return

        assetBinaryStorage.store(
            objectKey = createPreviewObjectKey(objectKey),
            contentType = generatedPreview.contentType,
            content = generatedPreview.content,
        )
    }

    private fun loadOrGenerateVideoPreview(currentFile: AssetFileEntity): LoadedAssetObject? {
        val previewObjectKey = createPreviewObjectKey(currentFile.objectKey)
        val cachedPreview = assetBinaryStorage.loadOrNull(
            bucket = currentFile.bucketName,
            objectKey = previewObjectKey,
        )
        if (cachedPreview != null) {
            return cachedPreview
        }

        if (
            !assetBinaryStorage.exists(
                bucket = currentFile.bucketName,
                objectKey = currentFile.objectKey,
            )
        ) {
            return null
        }

        val originalObject = assetBinaryStorage.load(
            bucket = currentFile.bucketName,
            objectKey = currentFile.objectKey,
        )
        val generatedPreview = assetPreviewGenerator.generateVideoPreview(
            originalFileName = currentFile.originalFileName,
            contentBytes = originalObject.content,
        ) ?: return null

        assetBinaryStorage.store(
            objectKey = previewObjectKey,
            contentType = generatedPreview.contentType,
            content = generatedPreview.content,
        )

        return LoadedAssetObject(
            content = generatedPreview.content,
            contentType = generatedPreview.contentType,
        )
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

    private fun String?.normalizedSearchTerms(): List<String> = this
        ?.let(::normalizeText)
        ?.trim()
        ?.lowercase()
        ?.split(Regex("\\s+"))
        ?.filter { searchTerm -> searchTerm.isNotBlank() }
        .orEmpty()

    private fun normalizeText(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFC)
}

private data class AssetMetadataSnapshot(
    val title: String,
    val description: String?,
    val tags: AssetStructuredTagsResponse,
)
