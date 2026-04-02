package com.acts.asset.service

import com.acts.asset.api.AssetDownloadResult
import com.acts.asset.api.AssetFileAccessMode
import com.acts.asset.api.AssetFileAccessUrlResponse
import com.acts.asset.domain.AssetAccessAction
import com.acts.asset.domain.AssetAuthorizationService
import com.acts.asset.domain.AssetEntity
import com.acts.asset.domain.AssetFileEntity
import com.acts.asset.domain.AssetSourceKind
import com.acts.asset.domain.AssetType
import com.acts.asset.preview.AssetPreviewResult
import com.acts.asset.repository.AssetFileRepository
import com.acts.asset.repository.AssetRepository
import com.acts.asset.storage.AssetBinaryStorage
import com.acts.asset.storage.AssetStorageProperties
import com.acts.asset.storage.LoadedAssetObject
import com.acts.auth.audit.AdminAuditLogService
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.http.ContentDisposition
import org.springframework.stereotype.Service
import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@Service
class AssetFileAccessService(
    private val adminAuditLogService: AdminAuditLogService,
    private val assetAuthorizationService: AssetAuthorizationService,
    private val assetBinaryStorage: AssetBinaryStorage,
    private val assetCatalogService: AssetCatalogService,
    private val assetFileRepository: AssetFileRepository,
    private val assetRepository: AssetRepository,
    private val assetStorageProperties: AssetStorageProperties,
    private val assetUploadService: AssetUploadService,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun downloadAsset(assetId: Long, actorEmail: String): AssetDownloadResult {
        val actor = requireActor(userAccountRepository, actorEmail)
        val asset = assetCatalogService.requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(actor = actor, asset = asset, action = AssetAccessAction.DOWNLOAD)
        require(asset.sourceKind == AssetSourceKind.FILE) { "링크 자산은 다운로드할 수 없습니다." }
        val currentFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("다운로드할 파일을 찾을 수 없습니다.")
        require(assetBinaryStorage.exists(bucket = currentFile.bucketName, objectKey = currentFile.objectKey)) { "다운로드할 파일을 찾을 수 없습니다." }
        val loadedAssetObject = assetBinaryStorage.load(bucket = currentFile.bucketName, objectKey = currentFile.objectKey)
        return AssetDownloadResult(
            content = loadedAssetObject.content,
            contentType = loadedAssetObject.contentType ?: currentFile.mimeType,
            fileName = currentFile.originalFileName,
        )
    }

    @Transactional
    fun issueFileAccessUrl(assetId: Long, actorEmail: String, mode: AssetFileAccessMode): AssetFileAccessUrlResponse {
        val actor = requireActor(userAccountRepository, actorEmail)
        val asset = assetCatalogService.requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(actor = actor, asset = asset, action = AssetAccessAction.DOWNLOAD)
        require(asset.sourceKind == AssetSourceKind.FILE) { "링크 자산은 파일 접근 URL을 발급할 수 없습니다." }
        val currentFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("다운로드할 파일을 찾을 수 없습니다.")
        require(assetBinaryStorage.exists(bucket = currentFile.bucketName, objectKey = currentFile.objectKey)) { "다운로드할 파일을 찾을 수 없습니다." }
        val expirationMinutes = assetStorageProperties.accessUrlExpirationMinutes
        val contentDisposition = when (mode) {
            AssetFileAccessMode.DOWNLOAD -> ContentDisposition.attachment()
            AssetFileAccessMode.PLAYBACK -> ContentDisposition.inline()
        }.filename(currentFile.originalFileName, StandardCharsets.UTF_8).build().toString()

        return AssetFileAccessUrlResponse(
            url = assetBinaryStorage.presignDownloadUrl(
                bucket = currentFile.bucketName, objectKey = currentFile.objectKey,
                contentType = currentFile.mimeType, contentDisposition = contentDisposition,
                expirationMinutes = expirationMinutes,
            ),
            fileName = currentFile.originalFileName, contentType = currentFile.mimeType,
            expiresAt = Instant.now().plusSeconds(expirationMinutes * 60), mode = mode,
        )
    }

    @Transactional
    fun loadPreview(assetId: Long, actorEmail: String): AssetPreviewResult {
        val actor = requireActor(userAccountRepository, actorEmail)
        val asset = assetCatalogService.requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(actor = actor, asset = asset, action = AssetAccessAction.DETAIL_VIEW)
        require(asset.sourceKind == AssetSourceKind.FILE) { "링크 자산은 프리뷰를 지원하지 않습니다." }
        val currentFile = assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
            ?: throw IllegalArgumentException("프리뷰 대상 파일을 찾을 수 없습니다.")

        val previewObject = when (asset.assetType) {
            AssetType.IMAGE -> if (assetBinaryStorage.exists(bucket = currentFile.bucketName, objectKey = currentFile.objectKey)) {
                assetBinaryStorage.load(bucket = currentFile.bucketName, objectKey = currentFile.objectKey)
            } else null
            AssetType.VIDEO -> loadGeneratedVideoPreview(currentFile)
            else -> null
        } ?: throw IllegalArgumentException("프리뷰 대상 파일을 찾을 수 없습니다.")

        return AssetPreviewResult(content = previewObject.content, contentType = previewObject.contentType ?: "application/octet-stream")
    }

    @Transactional
    fun exportAssets(actorEmail: String): AssetDownloadResult {
        val actor = requireActor(userAccountRepository, actorEmail)
        assetAuthorizationService.requireExportAllAccess(actor)

        val assets = assetAuthorizationService.filterVisibleAssets(
            actor = actor, assets = assetRepository.findAllByDeletedAtIsNullOrderByCreatedAtDescIdDesc(),
        )
        val readyAssets = assetCatalogService.filterReadyAssets(assets)
        val assetIds = readyAssets.mapNotNull { it.id }
        val currentFilesByAssetId = if (assetIds.isEmpty()) emptyMap<Long, AssetFileEntity>()
        else assetFileRepository.findAllByAsset_IdInOrderByAsset_IdAscVersionNumberDescIdDesc(assetIds)
            .groupBy { requireNotNull(it.asset.id) }.mapValues { (_, files) -> files.first() }

        val zipContent = ByteArrayOutputStream().use { buffer ->
            ZipOutputStream(buffer).use { zos ->
                readyAssets.forEach { asset ->
                    if (asset.sourceKind == AssetSourceKind.LINK) {
                        zos.putNextEntry(ZipEntry(buildExportEntryName(asset, "${asset.title}-link.txt")))
                        zos.write(buildLinkExportContent(asset).toByteArray())
                        zos.closeEntry()
                        return@forEach
                    }
                    val currentFile = currentFilesByAssetId[requireNotNull(asset.id)]
                        ?: throw IllegalArgumentException("내보낼 파일 정보를 찾을 수 없습니다.")
                    require(assetBinaryStorage.exists(bucket = currentFile.bucketName, objectKey = currentFile.objectKey)) { "내보낼 파일 정보를 찾을 수 없습니다." }
                    val loaded = assetBinaryStorage.load(bucket = currentFile.bucketName, objectKey = currentFile.objectKey)
                    zos.putNextEntry(ZipEntry(buildExportEntryName(asset, currentFile.originalFileName)))
                    zos.write(loaded.content)
                    zos.closeEntry()
                }
            }
            buffer.toByteArray()
        }

        adminAuditLogService.recordAssetExported(actorEmail = actor.email, actorName = actor.displayName, exportedAssetCount = readyAssets.size)
        return AssetDownloadResult(content = zipContent, contentType = "application/zip", fileName = buildExportFileName())
    }

    private fun loadGeneratedVideoPreview(currentFile: AssetFileEntity): LoadedAssetObject? {
        val previewObjectKey = "${currentFile.objectKey}.preview.jpg"
        val cached = assetBinaryStorage.loadOrNull(bucket = currentFile.bucketName, objectKey = previewObjectKey)
        if (cached != null) return cached
        assetUploadService.requestVideoPreviewGenerationIfNeeded(AssetType.VIDEO, currentFile)
        return null
    }

    private fun buildExportEntryName(asset: AssetEntity, originalFileName: String): String {
        val orgSegment = sanitizeExportName(asset.organization?.name ?: "org-unassigned")
        val fileSegment = sanitizeExportName(originalFileName)
        return "$orgSegment/${requireNotNull(asset.id)}-$fileSegment"
    }

    private fun buildExportFileName(): String {
        val timestamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss", Locale.US).withZone(ZoneOffset.UTC).format(Instant.now())
        return "acts-assets-export-$timestamp.zip"
    }

    private fun buildLinkExportContent(asset: AssetEntity): String = buildString {
        appendLine("title: ${asset.title}")
        appendLine("linkType: ${asset.linkType ?: "기타"}")
        appendLine("url: ${asset.linkUrl ?: ""}")
    }

    private fun sanitizeExportName(name: String): String = name.trim()
        .replace(Regex("[^\\p{L}\\p{N}._-]+"), "-").replace(Regex("-+"), "-").trim('-').ifBlank { "asset" }
}
