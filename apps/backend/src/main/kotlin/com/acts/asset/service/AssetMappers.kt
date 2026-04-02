package com.acts.asset.service

import com.acts.asset.api.AssetDetailResponse
import com.acts.asset.api.AssetEventResponse
import com.acts.asset.api.AssetFileResponse
import com.acts.asset.api.AssetStructuredTagsResponse
import com.acts.asset.api.AssetSummaryResponse
import com.acts.asset.api.AssetTypeMetadataRequest
import com.acts.asset.api.AssetTypeMetadataResponse
import com.acts.asset.domain.AssetEntity
import com.acts.asset.domain.AssetFileEntity
import com.acts.asset.domain.AssetSourceKind
import com.acts.asset.domain.AssetType
import com.acts.asset.domain.AssetPermissionSnapshot
import com.acts.asset.tag.AssetTagEntity
import com.acts.asset.tag.AssetTagType
import com.acts.auth.user.UserAccountEntity
import com.acts.auth.user.UserAccountRepository
import java.text.Normalizer

fun AssetEntity.toSummaryResponse(
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

fun AssetEntity.toDetailResponse(
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

fun AssetEntity.toTypeMetadataResponse(): AssetTypeMetadataResponse = AssetTypeMetadataResponse(
    imageArtStyle = imageArtStyle,
    imageHasLayerFile = imageHasLayerFile,
    audioTtsVoice = audioTtsVoice,
    audioRecordingType = audioRecordingType,
    videoStage = videoStage,
    documentKind = documentKind,
)

fun AssetEntity.applyTypeMetadata(typeMetadata: AssetTypeMetadataResponse) {
    imageArtStyle = typeMetadata.imageArtStyle
    imageHasLayerFile = typeMetadata.imageHasLayerFile
    audioTtsVoice = typeMetadata.audioTtsVoice
    audioRecordingType = typeMetadata.audioRecordingType
    videoStage = typeMetadata.videoStage
    documentKind = typeMetadata.documentKind
}

fun List<AssetTagEntity>.toStructuredTagsResponse(): AssetStructuredTagsResponse = AssetStructuredTagsResponse(
    characters = filter { tag -> tag.tagType == AssetTagType.CHARACTER }.map { tag -> tag.value },
    locations = filter { tag -> tag.tagType == AssetTagType.LOCATION }.map { tag -> tag.value },
    keywords = filter { tag -> tag.tagType == AssetTagType.KEYWORD }.map { tag -> tag.value },
)

fun String?.normalizedOrNull(): String? = this
    ?.let(::normalizeText)
    ?.trim()
    ?.takeIf { value -> value.isNotEmpty() }

fun normalizeText(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFC)

fun requireActor(userAccountRepository: UserAccountRepository, actorEmail: String): UserAccountEntity =
    userAccountRepository.findById(actorEmail.lowercase())
        .orElseThrow { IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.") }

fun resolveTypeMetadata(
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
            require(request.audioRecordingType == null && normalizedAudioTtsVoice == null && request.videoStage == null && request.documentKind == null) { "이미지 자산에는 이미지 세부 정보만 저장할 수 있습니다." }
            AssetTypeMetadataResponse(imageArtStyle = request.imageArtStyle, imageHasLayerFile = request.imageHasLayerFile ?: false)
        }
        assetType == AssetType.AUDIO -> {
            require(request.imageArtStyle == null && request.imageHasLayerFile == null && request.videoStage == null && request.documentKind == null) { "오디오 자산에는 오디오 세부 정보만 저장할 수 있습니다." }
            AssetTypeMetadataResponse(audioTtsVoice = normalizedAudioTtsVoice, audioRecordingType = request.audioRecordingType)
        }
        assetType == AssetType.VIDEO -> {
            require(request.imageArtStyle == null && request.imageHasLayerFile == null && normalizedAudioTtsVoice == null && request.audioRecordingType == null && request.documentKind == null) { "영상 자산에는 영상 세부 정보만 저장할 수 있습니다." }
            AssetTypeMetadataResponse(videoStage = request.videoStage)
        }
        assetType == AssetType.DOCUMENT -> {
            require(request.imageArtStyle == null && request.imageHasLayerFile == null && normalizedAudioTtsVoice == null && request.audioRecordingType == null && request.videoStage == null) { "문서 자산에는 문서 세부 정보만 저장할 수 있습니다." }
            AssetTypeMetadataResponse(documentKind = request.documentKind)
        }
        else -> {
            require(!request.hasAnyValue(normalizedAudioTtsVoice)) { "이 자산 유형은 추가 파일 세부 정보를 지원하지 않습니다." }
            AssetTypeMetadataResponse()
        }
    }
}

private fun AssetTypeMetadataRequest.hasAnyValue(normalizedAudioTtsVoice: String?): Boolean =
    imageArtStyle != null || imageHasLayerFile != null || normalizedAudioTtsVoice != null ||
        audioRecordingType != null || videoStage != null || documentKind != null

internal data class PendingAssetResult(val assetId: Long, val objectKey: String, val contentType: String)

internal data class UploadCompletionContext(
    val actor: UserAccountEntity,
    val asset: AssetEntity,
    val pendingFile: AssetFileEntity,
)
