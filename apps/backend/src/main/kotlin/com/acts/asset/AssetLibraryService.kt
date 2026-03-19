package com.acts.asset

import com.acts.auth.AdminAuditLogService
import com.acts.auth.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.text.Normalizer
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
    private val assetTagRepository: AssetTagRepository,
    private val assetTagSuggestionService: AssetTagSuggestionService,
    private val assetTypeClassifier: AssetTypeClassifier,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun uploadAsset(command: AssetUploadCommand): AssetSummaryResponse {
        require(command.contentBytes.isNotEmpty()) { "업로드할 파일이 비어 있습니다." }

        val actor = userAccountRepository.findById(command.actorEmail.lowercase())
            .orElseThrow { IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.") }
        val resolvedFileName = normalizeText(command.fileName).trim()
        val resolvedTitle = command.title.normalizedOrNull() ?: resolvedFileName.substringBeforeLast(".", resolvedFileName)
        val resolvedDescription = command.description.normalizedOrNull()
        val contentType = command.contentType.normalizedOrNull() ?: "application/octet-stream"
        val assetType = assetTypeClassifier.classify(
            fileName = resolvedFileName,
            contentType = contentType,
        )
        val metadata = assetMetadataExtractor.extract(
            assetType = assetType,
            contentBytes = command.contentBytes,
        )
        val tags = assetTagSuggestionService.buildTags(
            fileName = resolvedFileName,
            title = resolvedTitle,
            assetType = assetType,
            requestedTags = command.requestedTags,
        )
        val objectKey = createObjectKey(resolvedFileName)
        val storedAssetObject = assetBinaryStorage.store(
            objectKey = objectKey,
            contentType = contentType,
            content = command.contentBytes,
        )
        val asset = assetRepository.save(
            AssetEntity(
                title = resolvedTitle,
                assetType = assetType,
                assetStatus = AssetStatus.READY,
                description = resolvedDescription,
                sourceType = AssetSourceType.EXTERNAL_UPLOAD,
                sourceDetail = command.sourceDetail.normalizedOrNull(),
                originalFileName = resolvedFileName,
                mimeType = contentType,
                fileSizeBytes = command.contentBytes.size.toLong(),
                fileExtension = resolvedFileName.substringAfterLast(".", "").normalizedOrNull(),
                ownerEmail = actor.email,
                ownerName = actor.displayName,
                organization = actor.organization,
                currentVersionNumber = 1,
                searchText = buildSearchText(
                    title = resolvedTitle,
                    description = resolvedDescription,
                    fileName = resolvedFileName,
                    ownerName = actor.displayName,
                    organizationName = actor.organization?.name,
                    tags = tags.map { tag -> tag.value },
                ),
                widthPx = metadata.widthPx,
                heightPx = metadata.heightPx,
                durationMs = metadata.durationMs,
            ),
        )
        val savedAssetId = requireNotNull(asset.id)
        assetFileRepository.save(
            AssetFileEntity(
                asset = asset,
                versionNumber = 1,
                bucketName = storedAssetObject.bucket,
                objectKey = storedAssetObject.objectKey,
                originalFileName = resolvedFileName,
                mimeType = contentType,
                fileSizeBytes = command.contentBytes.size.toLong(),
                checksumSha256 = calculateSha256(command.contentBytes),
                createdByEmail = actor.email,
                createdByName = actor.displayName,
            ),
        )
        storeGeneratedPreviewIfNeeded(
            assetType = assetType,
            objectKey = storedAssetObject.objectKey,
            originalFileName = resolvedFileName,
            contentBytes = command.contentBytes,
        )
        assetTagRepository.saveAll(
            tags.map { tagCandidate ->
                AssetTagEntity(
                    asset = asset,
                    value = tagCandidate.value,
                    normalizedValue = tagCandidate.normalizedValue,
                    source = tagCandidate.source,
                )
            },
        )
        assetEventRepository.save(
            AssetEventEntity(
                asset = asset,
                eventType = AssetEventType.CREATED,
                actorEmail = actor.email,
                actorName = actor.displayName,
                detail = "파일 업로드로 자산이 등록되었습니다.",
            ),
        )

        return listAssets(actor.email)
            .first { assetSummary -> assetSummary.id == savedAssetId }
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

        val assetIds = assets.mapNotNull { asset -> asset.id }
        val tagsByAssetId = assetTagRepository.findAllByAssetIds(assetIds)
            .groupBy(
                keySelector = { assetTag -> requireNotNull(assetTag.asset.id) },
                valueTransform = { assetTag -> assetTag.value },
            )

        return assets
            .map { asset ->
                asset.toSummaryResponse(
                    tags = tagsByAssetId[asset.id].orEmpty(),
                    permissions = assetAuthorizationService.permissionsFor(actor, asset),
                )
            }
            .filter { summary -> summary.matches(query) }
    }

    @Transactional
    fun getAsset(
        assetId: Long,
        actorEmail: String,
    ): AssetDetailResponse {
        val actor = requireActor(actorEmail)
        val asset = requireActiveAsset(assetId)
        assetAuthorizationService.requireViewAccess(
            actor = actor,
            asset = asset,
            action = AssetAccessAction.DETAIL_VIEW,
        )
        val currentFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("현재 파일 정보를 찾을 수 없습니다.")
        val tags = assetTagRepository.findAllByAsset_IdOrderByIdAsc(assetId)
            .map { assetTag -> assetTag.value }
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
            tags = tags,
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
        requestedTags: List<String>,
        actorEmail: String,
        actorName: String?,
    ): AssetDetailResponse {
        val actor = requireActor(actorEmail)
        val asset = requireActiveAsset(assetId)
        assetAuthorizationService.requireEditAccess(actor, asset)
        val resolvedTitle = title.normalizedOrNull()
            ?: throw IllegalArgumentException("제목은 비어 있을 수 없습니다.")
        val resolvedDescription = description.normalizedOrNull()
        val nextTags = assetTagSuggestionService.buildTags(
            fileName = asset.originalFileName,
            title = resolvedTitle,
            assetType = asset.assetType,
            requestedTags = requestedTags,
        )
        val previousState = AssetMetadataSnapshot(
            title = asset.title,
            description = asset.description,
            tags = assetTagRepository.findAllByAsset_IdOrderByIdAsc(assetId).map { assetTag -> assetTag.value },
        )

        asset.title = resolvedTitle
        asset.description = resolvedDescription
        asset.searchText = buildSearchText(
            title = resolvedTitle,
            description = resolvedDescription,
            fileName = asset.originalFileName,
            ownerName = asset.ownerName,
            organizationName = asset.organization?.name,
            tags = nextTags.map { tag -> tag.value },
        )
        val savedAsset = assetRepository.save(asset)

        assetTagRepository.deleteAllByAsset_Id(assetId)
        assetTagRepository.flush()
        assetTagRepository.saveAll(
            nextTags.map { tagCandidate ->
                AssetTagEntity(
                    asset = asset,
                    value = tagCandidate.value,
                    normalizedValue = tagCandidate.normalizedValue,
                    source = tagCandidate.source,
                )
            },
        )

        val nextState = AssetMetadataSnapshot(
            title = savedAsset.title,
            description = savedAsset.description,
            tags = nextTags.map { tag -> tag.value },
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
        val asset = requireActiveAsset(assetId)
        assetAuthorizationService.requireViewAccess(
            actor = actor,
            asset = asset,
            action = AssetAccessAction.DETAIL_VIEW,
        )
        val currentFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("프리뷰 대상 파일을 찾을 수 없습니다.")

        val previewObject = when (asset.assetType) {
            AssetType.IMAGE -> assetBinaryStorage.load(
                bucket = currentFile.bucketName,
                objectKey = currentFile.objectKey,
            )
            AssetType.VIDEO -> loadOrGenerateVideoPreview(currentFile)
            else -> null
        } ?: throw IllegalStateException("프리뷰 생성에 실패했습니다.")

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
        val asset = requireActiveAsset(assetId)
        assetAuthorizationService.requireViewAccess(
            actor = actor,
            asset = asset,
            action = AssetAccessAction.DOWNLOAD,
        )
        val currentFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("다운로드할 파일을 찾을 수 없습니다.")
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
    fun deleteAsset(
        assetId: Long,
        actorEmail: String,
        actorName: String?,
    ) {
        val actor = requireActor(actorEmail)
        val asset = requireActiveAsset(assetId)
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
        val assetIds = assets.mapNotNull { asset -> asset.id }
        val currentFilesByAssetId = if (assetIds.isEmpty()) {
            emptyMap<Long, AssetFileEntity>()
        } else {
            assetFileRepository.findAllByAsset_IdInOrderByAsset_IdAscVersionNumberDescIdDesc(assetIds)
                .groupBy { assetFile -> requireNotNull(assetFile.asset.id) }
                .mapValues { (_, files) -> files.first() }
        }

        val zipContent = ByteArrayOutputStream().use { buffer ->
            ZipOutputStream(buffer).use { zipOutputStream ->
                assets.forEach { asset ->
                    val assetId = requireNotNull(asset.id)
                    val currentFile = currentFilesByAssetId[assetId]
                        ?: throw IllegalArgumentException("내보낼 파일 정보를 찾을 수 없습니다.")
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
            exportedAssetCount = assets.size,
        )

        return AssetDownloadResult(
            content = zipContent,
            contentType = "application/zip",
            fileName = buildExportFileName(),
        )
    }

    private fun AssetSummaryResponse.matches(query: AssetListQuery): Boolean {
        val normalizedSearchTerms = query.search.normalizedSearchTerms()
        if (normalizedSearchTerms.isNotEmpty()) {
            val searchable = buildList {
                add(title.normalizedSearchValue())
                description?.normalizedSearchValue()?.let(::add)
                add(originalFileName.normalizedSearchValue())
                add(ownerName.normalizedSearchValue())
                add(ownerEmail.normalizedSearchValue())
                organizationName?.normalizedSearchValue()?.let(::add)
                addAll(tags.map { tag -> tag.normalizedSearchValue() })
            }.joinToString(" ")

            if (normalizedSearchTerms.any { searchTerm -> !searchable.contains(searchTerm) }) {
                return false
            }
        }

        if (query.assetType != null && type != query.assetType) {
            return false
        }

        if (query.organizationId != null && organizationId != query.organizationId) {
            return false
        }

        if (query.creatorEmail != null && !ownerEmail.equals(query.creatorEmail, ignoreCase = true)) {
            return false
        }

        return true
    }

    private fun requireActiveAsset(assetId: Long): AssetEntity = assetRepository.findByIdAndDeletedAtIsNull(assetId)
        ?: throw IllegalArgumentException("자산을 찾을 수 없습니다.")

    private fun requireActor(actorEmail: String) = userAccountRepository.findById(actorEmail.lowercase())
        .orElseThrow { IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.") }

    private fun AssetEntity.toSummaryResponse(
        tags: List<String>,
        permissions: AssetPermissionSnapshot,
    ): AssetSummaryResponse = AssetSummaryResponse(
        id = requireNotNull(id),
        title = title,
        type = assetType,
        status = assetStatus,
        description = description,
        sourceType = sourceType,
        sourceDetail = sourceDetail,
        originalFileName = originalFileName,
        mimeType = mimeType,
        fileSizeBytes = fileSizeBytes,
        fileExtension = fileExtension,
        versionNumber = currentVersionNumber,
        ownerEmail = ownerEmail,
        ownerName = ownerName,
        organizationId = organization?.id,
        organizationName = organization?.name,
        widthPx = widthPx,
        heightPx = heightPx,
        durationMs = durationMs,
        tags = tags,
        canEdit = permissions.canEdit,
        canDelete = permissions.canDelete,
        canDownload = permissions.canDownload,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

    private fun AssetEntity.toDetailResponse(
        tags: List<String>,
        currentFile: AssetFileEntity,
        events: List<AssetEventResponse>,
        permissions: AssetPermissionSnapshot,
    ): AssetDetailResponse = AssetDetailResponse(
        id = requireNotNull(id),
        title = title,
        type = assetType,
        status = assetStatus,
        description = description,
        sourceType = sourceType,
        sourceDetail = sourceDetail,
        originalFileName = originalFileName,
        mimeType = mimeType,
        fileSizeBytes = fileSizeBytes,
        fileExtension = fileExtension,
        versionNumber = currentVersionNumber,
        ownerEmail = ownerEmail,
        ownerName = ownerName,
        organizationId = organization?.id,
        organizationName = organization?.name,
        widthPx = widthPx,
        heightPx = heightPx,
        durationMs = durationMs,
        tags = tags,
        canEdit = permissions.canEdit,
        canDelete = permissions.canDelete,
        canDownload = permissions.canDownload,
        createdAt = createdAt,
        updatedAt = updatedAt,
        currentFile = AssetFileResponse(
            bucketName = currentFile.bucketName,
            objectKey = currentFile.objectKey,
            originalFileName = currentFile.originalFileName,
            mimeType = currentFile.mimeType,
            fileSizeBytes = currentFile.fileSizeBytes,
            checksumSha256 = currentFile.checksumSha256,
            versionNumber = currentFile.versionNumber,
            createdByEmail = currentFile.createdByEmail,
            createdByName = currentFile.createdByName,
            createdAt = currentFile.createdAt,
        ),
        events = events,
    )

    private fun createObjectKey(fileName: String): String {
        val timestampPrefix = DateTimeFormatter.ofPattern("yyyy/MM/dd", Locale.US)
            .withZone(ZoneOffset.UTC)
            .format(Instant.now())

        return "assets/$timestampPrefix/${UUID.randomUUID()}-${sanitizeFileName(fileName)}"
    }

    private fun createPreviewObjectKey(objectKey: String): String = "$objectKey.preview.jpg"

    private fun sanitizeFileName(fileName: String): String = fileName
        .trim()
        .replace(Regex("[^\\p{L}\\p{N}._-]+"), "-")
        .replace(Regex("-+"), "-")
        .trim('-')
        .ifBlank { "asset" }

    private fun buildSearchText(
        title: String,
        description: String?,
        fileName: String,
        ownerName: String,
        organizationName: String?,
        tags: List<String>,
    ): String = buildList {
        add(title)
        add(fileName)
        add(ownerName)
        description?.let(::add)
        organizationName?.let(::add)
        addAll(tags)
    }.joinToString(" ") { value -> value.normalizedSearchValue() }

    private fun calculateSha256(contentBytes: ByteArray): String = MessageDigest.getInstance("SHA-256")
        .digest(contentBytes)
        .joinToString("") { byteValue -> "%02x".format(byteValue) }

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

    private fun String?.normalizedSearchTerms(): List<String> = this
        ?.let(::normalizeText)
        ?.trim()
        ?.lowercase()
        ?.split(Regex("\\s+"))
        ?.filter { searchTerm -> searchTerm.isNotBlank() }
        .orEmpty()

    private fun String.normalizedSearchValue(): String = normalizeText(this).trim().lowercase()

    private fun normalizeText(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFC)
}

private data class AssetMetadataSnapshot(
    val title: String,
    val description: String?,
    val tags: List<String>,
)
