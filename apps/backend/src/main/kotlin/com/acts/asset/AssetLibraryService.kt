package com.acts.asset

import com.acts.auth.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

@Service
class AssetLibraryService(
    private val assetBinaryStorage: AssetBinaryStorage,
    private val assetEventRepository: AssetEventRepository,
    private val assetFileRepository: AssetFileRepository,
    private val assetMetadataExtractor: AssetMetadataExtractor,
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
        val resolvedFileName = command.fileName.trim()
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

        return listAssets()
            .first { assetSummary -> assetSummary.id == savedAssetId }
    }

    @Transactional
    fun listAssets(query: AssetListQuery = AssetListQuery()): List<AssetSummaryResponse> {
        val assets = assetRepository.findAllByDeletedAtIsNullOrderByCreatedAtDescIdDesc()
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
            .map { asset -> asset.toSummaryResponse(tagsByAssetId[asset.id].orEmpty()) }
            .filter { summary -> summary.matches(query) }
    }

    @Transactional
    fun getAsset(assetId: Long): AssetDetailResponse {
        val asset = requireActiveAsset(assetId)
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
        val asset = requireActiveAsset(assetId)
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
        assetRepository.save(asset)

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
            title = asset.title,
            description = asset.description,
            tags = nextTags.map { tag -> tag.value },
        )

        if (previousState != nextState) {
            assetEventRepository.save(
                AssetEventEntity(
                    asset = asset,
                    eventType = AssetEventType.METADATA_UPDATED,
                    actorEmail = actorEmail,
                    actorName = actorName,
                    detail = buildMetadataUpdateDetail(previousState, nextState),
                ),
            )
        }

        return getAsset(assetId)
    }

    @Transactional
    fun downloadAsset(assetId: Long): AssetDownloadResult {
        requireActiveAsset(assetId)
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
        val actor = userAccountRepository.findById(actorEmail.lowercase())
            .orElseThrow { IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.") }
        val asset = requireActiveAsset(assetId)

        if (actor.role != com.acts.auth.UserRole.ADMIN &&
            !asset.ownerEmail.equals(actor.email, ignoreCase = true)
        ) {
            throw SecurityException("삭제 권한이 없습니다.")
        }

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

    private fun AssetSummaryResponse.matches(query: AssetListQuery): Boolean {
        val normalizedSearchTerms = query.search.normalizedSearchTerms()
        if (normalizedSearchTerms.isNotEmpty()) {
            val searchable = buildList {
                add(title.lowercase())
                description?.lowercase()?.let(::add)
                add(originalFileName.lowercase())
                add(ownerName.lowercase())
                add(ownerEmail.lowercase())
                organizationName?.lowercase()?.let(::add)
                addAll(tags.map { tag -> tag.lowercase() })
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

    private fun AssetEntity.toSummaryResponse(tags: List<String>): AssetSummaryResponse = AssetSummaryResponse(
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
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

    private fun AssetEntity.toDetailResponse(
        tags: List<String>,
        currentFile: AssetFileEntity,
        events: List<AssetEventResponse>,
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
    }.joinToString(" ") { value -> value.trim().lowercase() }

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

    private fun String?.normalizedOrNull(): String? = this?.trim()?.takeIf { value -> value.isNotEmpty() }

    private fun String?.normalizedSearchTerms(): List<String> = this
        ?.trim()
        ?.lowercase()
        ?.split(Regex("\\s+"))
        ?.filter { searchTerm -> searchTerm.isNotBlank() }
        .orEmpty()
}

private data class AssetMetadataSnapshot(
    val title: String,
    val description: String?,
    val tags: List<String>,
)
