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
        val assets = assetRepository.findAllByOrderByCreatedAtDescIdDesc()
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

    private fun String?.normalizedOrNull(): String? = this?.trim()?.takeIf { value -> value.isNotEmpty() }

    private fun String?.normalizedSearchTerms(): List<String> = this
        ?.trim()
        ?.lowercase()
        ?.split(Regex("\\s+"))
        ?.filter { searchTerm -> searchTerm.isNotBlank() }
        .orEmpty()
}
