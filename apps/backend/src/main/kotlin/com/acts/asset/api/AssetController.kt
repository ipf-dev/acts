package com.acts.asset.api

import com.acts.asset.domain.AssetType
import com.acts.asset.service.AssetCatalogService
import com.acts.asset.service.AssetCommandService
import com.acts.asset.service.AssetFileAccessService
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.net.URI
import java.nio.charset.StandardCharsets

@RestController
@RequestMapping("/api/assets")
class AssetController(
    private val assetCatalogService: AssetCatalogService,
    private val assetCommandService: AssetCommandService,
    private val assetFileAccessService: AssetFileAccessService,
) {
    @GetMapping
    fun listAssets(
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) assetType: AssetType?,
        @RequestParam(required = false) organizationId: Long?,
        @RequestParam(required = false) creatorEmail: String?,
        @RequestParam(required = false) imageArtStyle: AssetImageArtStyle?,
        @RequestParam(required = false) imageHasLayerFile: Boolean?,
        @RequestParam(required = false) audioTtsVoice: String?,
        @RequestParam(required = false) audioRecordingType: AssetAudioRecordingType?,
        @RequestParam(required = false) videoStage: AssetVideoStage?,
        @RequestParam(required = false) documentKind: AssetDocumentKind?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "24") size: Int,
        authentication: Authentication?,
    ): ResponseEntity<AssetCatalogPageResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return try {
            ResponseEntity.ok(
                assetCatalogService.listAssetCatalog(
                    actorEmail = actorEmail,
                    query = AssetListQuery(
                        search = search, assetType = assetType, organizationId = organizationId,
                        creatorEmail = creatorEmail, imageArtStyle = imageArtStyle,
                        imageHasLayerFile = imageHasLayerFile, audioTtsVoice = audioTtsVoice,
                        audioRecordingType = audioRecordingType, videoStage = videoStage,
                        documentKind = documentKind,
                    ),
                    page = page, size = size,
                ),
            )
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.BAD_REQUEST).build() }
    }

    @GetMapping("/filter-options")
    fun listAssetFilterOptions(authentication: Authentication?): ResponseEntity<AssetCatalogFilterOptionsResponse> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return try { ResponseEntity.ok(assetCatalogService.listAssetCatalogFilterOptions(actorEmail))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build() }
    }

    @GetMapping("/{assetId}")
    fun getAsset(@PathVariable assetId: Long, authentication: Authentication?): ResponseEntity<AssetDetailResponse> {
        return try {
            val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
            ResponseEntity.ok(assetCatalogService.getAsset(assetId = assetId, actorEmail = actorEmail))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalStateException) { ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.NOT_FOUND).build() }
    }

    @GetMapping("/{assetId}/download")
    fun downloadAsset(@PathVariable assetId: Long, authentication: Authentication?): ResponseEntity<Void> {
        return try {
            val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
            val fileAccessUrl = assetFileAccessService.issueFileAccessUrl(assetId = assetId, actorEmail = actorEmail, mode = AssetFileAccessMode.DOWNLOAD)
            ResponseEntity.status(HttpStatus.FOUND).location(URI.create(fileAccessUrl.url)).build()
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.NOT_FOUND).build() }
    }

    @GetMapping("/{assetId}/file-access-url")
    fun getFileAccessUrl(
        @PathVariable assetId: Long,
        @RequestParam(defaultValue = "DOWNLOAD") mode: AssetFileAccessMode,
        authentication: Authentication?,
    ): ResponseEntity<AssetFileAccessUrlResponse> {
        return try {
            val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
            ResponseEntity.ok(assetFileAccessService.issueFileAccessUrl(assetId = assetId, actorEmail = actorEmail, mode = mode))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.NOT_FOUND).build() }
    }

    @GetMapping("/{assetId}/preview")
    fun previewAsset(@PathVariable assetId: Long, authentication: Authentication?): ResponseEntity<ByteArrayResource> {
        return try {
            val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
            val previewResult = assetFileAccessService.loadPreview(assetId = assetId, actorEmail = actorEmail)
            ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(previewResult.contentType))
                .contentLength(previewResult.content.size.toLong())
                .body(ByteArrayResource(previewResult.content))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.NOT_FOUND).build() }
    }

    @GetMapping("/export")
    fun exportAssets(authentication: Authentication?): ResponseEntity<ByteArrayResource> {
        return try {
            val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
            val exportResult = assetFileAccessService.exportAssets(actorEmail)
            ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(exportResult.contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                    .filename(exportResult.fileName, StandardCharsets.UTF_8).build().toString())
                .contentLength(exportResult.content.size.toLong())
                .body(ByteArrayResource(exportResult.content))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.BAD_REQUEST).build() }
    }

    @PutMapping("/{assetId}")
    fun updateAsset(authentication: Authentication?, @PathVariable assetId: Long, @RequestBody request: AssetUpdateRequest): ResponseEntity<AssetDetailResponse> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)
        return try {
            ResponseEntity.ok(assetCommandService.updateAsset(
                assetId = assetId, title = request.title, description = request.description,
                requestedTags = request.tags, requestedTypeMetadata = request.typeMetadata,
                actorEmail = actorEmail, actorName = actorName,
            ))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.BAD_REQUEST).build() }
    }

    @DeleteMapping("/{assetId}")
    fun deleteAsset(authentication: Authentication?, @PathVariable assetId: Long): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)
        return try {
            assetCommandService.deleteAsset(assetId = assetId, actorEmail = actorEmail, actorName = actorName)
            ResponseEntity.noContent().build()
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.NOT_FOUND).build() }
    }

    companion object {
        fun currentActorEmail(authentication: Authentication?): String? = when (val principal = authentication?.principal) {
            is OidcUser -> principal.email?.lowercase()
            else -> authentication?.name?.lowercase()
        }

        fun currentActorName(authentication: Authentication?): String? = when (val principal = authentication?.principal) {
            is OidcUser -> principal.fullName ?: principal.givenName ?: principal.email
            else -> authentication?.name?.substringBefore("@")
        }
    }
}
