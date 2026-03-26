package com.acts.asset.tag

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/assets/tags")
class AssetTagController(
    private val assetTagManagementService: AssetTagManagementService,
) {
    @GetMapping("/characters")
    fun listCharacters(authentication: Authentication?): ResponseEntity<List<CharacterTagOptionResponse>> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            ResponseEntity.ok(assetTagManagementService.listCharacterOptions(actorEmail))
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
