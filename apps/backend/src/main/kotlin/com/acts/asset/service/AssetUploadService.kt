package com.acts.asset.service

import com.acts.asset.api.AssetMultipartUploadCompleteRequest
import com.acts.asset.api.AssetMultipartUploadIntentResponse
import com.acts.asset.api.AssetSummaryResponse
import com.acts.asset.api.AssetUploadCompleteRequest
import com.acts.asset.api.AssetUploadIntentRequest
import com.acts.asset.api.AssetUploadIntentResponse
import com.acts.asset.api.PresignedPartUrl
import com.acts.asset.domain.AssetAuthorizationService
import com.acts.asset.domain.AssetEntity
import com.acts.asset.domain.AssetFileEntity
import com.acts.asset.domain.AssetSourceKind
import com.acts.asset.domain.AssetType
import com.acts.asset.domain.AssetTypeClassifier
import com.acts.asset.event.AssetEventEntity
import com.acts.asset.event.AssetEventRepository
import com.acts.asset.event.AssetEventType
import com.acts.asset.preview.AssetPreviewDispatcher
import com.acts.asset.preview.VideoPreviewDispatchRequest
import com.acts.asset.repository.AssetFileRepository
import com.acts.asset.repository.AssetRepository
import com.acts.asset.storage.AssetBinaryStorage
import com.acts.asset.storage.AssetStorageProperties
import com.acts.asset.storage.CompletedPartInfo
import com.acts.asset.tag.AssetSearchTextBuilder
import com.acts.asset.tag.AssetTagEntity
import com.acts.asset.tag.AssetTagRepository
import com.acts.asset.tag.AssetTagSuggestionService
import com.acts.auth.user.UserAccountEntity
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID
import java.util.concurrent.CompletableFuture

@Service
class AssetUploadService(
    private val assetAuthorizationService: AssetAuthorizationService,
    private val assetBinaryStorage: AssetBinaryStorage,
    private val assetEventRepository: AssetEventRepository,
    private val assetFileRepository: AssetFileRepository,
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
        private const val MULTIPART_PART_SIZE: Long = 10L * 1024 * 1024
        private val logger = LoggerFactory.getLogger(AssetUploadService::class.java)
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
                    CompletedPartInfo(partNumber = part.partNumber, eTag = part.eTag)
                },
            )
        } catch (exception: Exception) {
            logger.error("Failed to complete multipart upload for assetId={} uploadId={}", assetId, request.uploadId, exception)
            assetBinaryStorage.abortMultipartUpload(objectKey = request.objectKey, uploadId = request.uploadId)
            throw IllegalStateException("멀티파트 업로드 완료에 실패했습니다.")
        }
        return finalizeUploadCompletion(
            actor = actor, asset = asset, pendingFile = pendingFile,
            fileSizeBytes = request.fileSizeBytes, widthPx = request.widthPx, heightPx = request.heightPx,
        )
    }

    @Transactional
    fun completeUpload(assetId: Long, request: AssetUploadCompleteRequest, actorEmail: String): AssetSummaryResponse {
        val (actor, asset, pendingFile) = validateUploadCompletion(assetId, request.objectKey, actorEmail)
        require(
            assetBinaryStorage.exists(bucket = pendingFile.bucketName, objectKey = pendingFile.objectKey),
        ) { "업로드된 파일을 아직 확인할 수 없습니다." }
        return finalizeUploadCompletion(
            actor = actor, asset = asset, pendingFile = pendingFile,
            fileSizeBytes = request.fileSizeBytes, widthPx = request.widthPx, heightPx = request.heightPx,
        )
    }

    private fun createPendingAsset(request: AssetUploadIntentRequest, actorEmail: String): PendingAssetResult {
        val actor = requireActor(userAccountRepository, actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)

        val resolvedFileName = normalizeText(request.fileName).trim()
        val contentType = request.contentType.normalizedOrNull() ?: "application/octet-stream"
        val resolvedTitle = request.title.normalizedOrNull() ?: resolvedFileName.substringBeforeLast(".", resolvedFileName)
        val resolvedDescription = request.description.normalizedOrNull()
        val assetType = assetTypeClassifier.classify(fileName = resolvedFileName, contentType = contentType)
        val tags = assetTagSuggestionService.buildTags(request.tags)
        val requestedTypeMetadata = if (assetType == AssetType.DOCUMENT && request.typeMetadata.documentKind == null) {
            request.typeMetadata.copy(documentKind = assetTypeClassifier.inferDocumentKind(fileName = resolvedFileName, contentType = contentType))
        } else {
            request.typeMetadata
        }
        val resolvedTypeMetadata = resolveTypeMetadata(assetType = assetType, sourceKind = AssetSourceKind.FILE, request = requestedTypeMetadata)
        val objectKey = createObjectKey(resolvedFileName)

        val asset = AssetEntity(
            title = resolvedTitle, assetType = assetType, sourceKind = AssetSourceKind.FILE,
            description = resolvedDescription, originalFileName = resolvedFileName, mimeType = contentType,
            fileSizeBytes = request.fileSizeBytes,
            fileExtension = resolvedFileName.substringAfterLast(".", "").normalizedOrNull(),
            linkUrl = null, linkType = null, ownerEmail = actor.email, ownerName = actor.displayName,
            organization = actor.organization, currentVersionNumber = 1, searchText = "",
            widthPx = null, heightPx = null, durationMs = null,
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
                    asset = savedAsset, value = tagCandidate.value, normalizedValue = tagCandidate.normalizedValue,
                    tagType = tagCandidate.tagType, source = tagCandidate.source,
                )
            },
        )

        assetFileRepository.save(
            AssetFileEntity(
                asset = savedAsset, versionNumber = 1, bucketName = assetStorageProperties.bucket,
                objectKey = objectKey, originalFileName = resolvedFileName, mimeType = contentType,
                fileSizeBytes = request.fileSizeBytes, checksumSha256 = null,
                createdByEmail = actor.email, createdByName = actor.displayName,
            ),
        )

        return PendingAssetResult(assetId = requireNotNull(savedAsset.id), objectKey = objectKey, contentType = contentType)
    }

    private fun validateUploadCompletion(assetId: Long, objectKey: String, actorEmail: String): UploadCompletionContext {
        val actor = requireActor(userAccountRepository, actorEmail)
        val asset = assetRepository.findById(assetId).orElseThrow { IllegalArgumentException("자산을 찾을 수 없습니다.") }
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
        actor: UserAccountEntity,
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
                asset = asset, eventType = AssetEventType.CREATED,
                actorEmail = actor.email, actorName = actor.displayName,
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

    internal fun requestVideoPreviewGenerationIfNeeded(assetType: AssetType, currentFile: AssetFileEntity) {
        if (assetType != AssetType.VIDEO) return
        val request = VideoPreviewDispatchRequest(
            bucket = currentFile.bucketName, objectKey = currentFile.objectKey,
            previewObjectKey = "${currentFile.objectKey}.preview.jpg",
            originalFileName = currentFile.originalFileName,
        )
        CompletableFuture.runAsync {
            runCatching { assetPreviewDispatcher.requestVideoPreview(request) }
                .onFailure { exception ->
                    logger.warn("Failed to dispatch video preview generation for asset file {}.", request.objectKey, exception)
                }
        }
    }

    private fun createObjectKey(fileName: String): String {
        val timestampPrefix = DateTimeFormatter.ofPattern("yyyy/MM/dd", Locale.US)
            .withZone(ZoneOffset.UTC).format(Instant.now())
        return "assets/$timestampPrefix/${UUID.randomUUID()}-${sanitizeFileName(fileName)}"
    }

    private fun sanitizeFileName(fileName: String): String = fileName.trim()
        .replace(Regex("[^\\p{L}\\p{N}._-]+"), "-").replace(Regex("-+"), "-").trim('-').ifBlank { "asset" }

}

