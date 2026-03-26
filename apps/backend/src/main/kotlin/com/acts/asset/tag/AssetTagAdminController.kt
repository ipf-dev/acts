package com.acts.asset.tag

import org.springframework.http.HttpStatus
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

@RestController
@RequestMapping("/api/auth/admin/asset-tags")
class AssetTagAdminController(
    private val assetTagManagementService: AssetTagManagementService,
) {
    @GetMapping
    fun getCatalog(authentication: Authentication?): ResponseEntity<AdminAssetTagCatalogResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            ResponseEntity.ok(assetTagManagementService.getAdminCatalog(actorEmail))
        } catch (_: SecurityException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    @PostMapping("/characters")
    fun createCharacter(
        authentication: Authentication?,
        @RequestBody request: CharacterTagUpsertRequest,
    ): ResponseEntity<AdminCharacterTagResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            ResponseEntity.ok(assetTagManagementService.createCharacterTag(actorEmail, request))
        } catch (_: SecurityException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    @PutMapping("/characters/{characterId}")
    fun updateCharacter(
        authentication: Authentication?,
        @PathVariable characterId: Long,
        @RequestBody request: CharacterTagUpsertRequest,
    ): ResponseEntity<AdminCharacterTagResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            ResponseEntity.ok(assetTagManagementService.updateCharacterTag(actorEmail, characterId, request))
        } catch (_: SecurityException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    @DeleteMapping("/characters/{characterId}")
    fun deleteCharacter(
        authentication: Authentication?,
        @PathVariable characterId: Long,
    ): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            assetTagManagementService.deleteCharacterTag(actorEmail, characterId)
            ResponseEntity.noContent().build()
        } catch (_: SecurityException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    @PutMapping("/rename")
    fun renameTag(
        authentication: Authentication?,
        @RequestBody request: AssetTagRenameRequest,
    ): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            assetTagManagementService.renameTag(actorEmail, request)
            ResponseEntity.noContent().build()
        } catch (_: SecurityException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    @PutMapping("/merge")
    fun mergeTags(
        authentication: Authentication?,
        @RequestBody request: AssetTagMergeRequest,
    ): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            assetTagManagementService.mergeTags(actorEmail, request)
            ResponseEntity.noContent().build()
        } catch (_: SecurityException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    @DeleteMapping
    fun deleteTag(
        authentication: Authentication?,
        @RequestParam tagType: AssetTagType,
        @RequestParam value: String,
    ): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            assetTagManagementService.deleteTagValue(actorEmail, tagType, value)
            ResponseEntity.noContent().build()
        } catch (_: SecurityException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    private fun currentActorEmail(authentication: Authentication?): String? = when (val principal = authentication?.principal) {
        is OidcUser -> principal.email?.lowercase()
        else -> authentication?.name?.lowercase()
    }
}
