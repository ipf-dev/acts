package com.acts.hub

import com.acts.asset.api.AssetController.Companion.currentActorEmail
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/hub")
class HubNavigationController(
    private val hubNavigationService: HubNavigationService,
) {
    @GetMapping("/navigation")
    fun getNavigation(authentication: Authentication?): ResponseEntity<HubNavigationResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubRequest {
            hubNavigationService.getNavigation(actorEmail = actorEmail)
        }
    }
}
