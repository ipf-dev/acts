package com.acts.asset

import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

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
