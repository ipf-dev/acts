package com.acts.asset

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
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.nio.charset.StandardCharsets

@RestController
@RequestMapping("/api/assets")
class AssetController(
    private val assetLibraryService: AssetLibraryService,
) {
    @GetMapping
    fun listAssets(
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) assetType: AssetType?,
        @RequestParam(required = false) organizationId: Long?,
        @RequestParam(required = false) creatorEmail: String?,
    ): List<AssetSummaryResponse> = assetLibraryService.listAssets(
        AssetListQuery(
            search = search,
            assetType = assetType,
            organizationId = organizationId,
            creatorEmail = creatorEmail,
        ),
    )

    @GetMapping("/{assetId}")
    fun getAsset(
        @PathVariable assetId: Long,
    ): ResponseEntity<AssetDetailResponse> = try {
        ResponseEntity.ok(assetLibraryService.getAsset(assetId))
    } catch (_: IllegalArgumentException) {
        ResponseEntity.status(HttpStatus.NOT_FOUND).build()
    }

    @GetMapping("/{assetId}/download")
    fun downloadAsset(
        @PathVariable assetId: Long,
    ): ResponseEntity<ByteArrayResource> = try {
        val downloadResult = assetLibraryService.downloadAsset(assetId)

        ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(downloadResult.contentType))
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment()
                    .filename(downloadResult.fileName, StandardCharsets.UTF_8)
                    .build()
                    .toString(),
            )
            .contentLength(downloadResult.content.size.toLong())
            .body(ByteArrayResource(downloadResult.content))
    } catch (_: IllegalArgumentException) {
        ResponseEntity.status(HttpStatus.NOT_FOUND).build()
    }

    @PutMapping("/{assetId}")
    fun updateAsset(
        authentication: Authentication?,
        @PathVariable assetId: Long,
        @RequestBody request: AssetUpdateRequest,
    ): ResponseEntity<AssetDetailResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)

        return try {
            ResponseEntity.ok(
                assetLibraryService.updateAsset(
                    assetId = assetId,
                    title = request.title,
                    description = request.description,
                    requestedTags = request.tags,
                    actorEmail = actorEmail,
                    actorName = actorName,
                ),
            )
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    @DeleteMapping("/{assetId}")
    fun deleteAsset(
        authentication: Authentication?,
        @PathVariable assetId: Long,
    ): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)

        return try {
            assetLibraryService.deleteAsset(
                assetId = assetId,
                actorEmail = actorEmail,
                actorName = actorName,
            )
            ResponseEntity.noContent().build()
        } catch (_: SecurityException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.NOT_FOUND).build()
        }
    }

    @PostMapping(
        "/uploads",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun uploadAsset(
        authentication: Authentication?,
        @RequestParam("file") file: MultipartFile,
        @RequestParam(required = false) title: String?,
        @RequestParam(required = false) description: String?,
        @RequestParam(required = false) sourceDetail: String?,
        @RequestParam(required = false) tags: List<String>?,
    ): ResponseEntity<AssetSummaryResponse> {
        if (file.isEmpty || file.originalFilename.isNullOrBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)

        return try {
            ResponseEntity.status(HttpStatus.CREATED).body(
                assetLibraryService.uploadAsset(
                    AssetUploadCommand(
                        actorEmail = actorEmail,
                        actorName = actorName,
                        title = title,
                        description = description,
                        requestedTags = tags.orEmpty(),
                        sourceDetail = sourceDetail,
                        fileName = requireNotNull(file.originalFilename),
                        contentType = file.contentType,
                        contentBytes = file.bytes,
                    ),
                ),
            )
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    private fun currentActorEmail(authentication: Authentication?): String? = when (val principal = authentication?.principal) {
        is OidcUser -> principal.email?.lowercase()
        else -> authentication?.name?.lowercase()
    }

    private fun currentActorName(authentication: Authentication?): String? = when (val principal = authentication?.principal) {
        is OidcUser -> principal.fullName ?: principal.givenName ?: principal.email
        else -> authentication?.name?.substringBefore("@")
    }
}
