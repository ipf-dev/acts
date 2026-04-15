package com.acts.hub

import com.acts.asset.api.AssetController.Companion.currentActorEmail
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/hub/levels")
class HubLevelController(
    private val hubEpisodeService: HubEpisodeService,
) {
    @PostMapping("/{levelKey}/episodes")
    fun createEpisode(
        @PathVariable levelKey: String,
        @RequestBody request: HubEpisodeUpsertRequest,
        authentication: Authentication?,
    ): ResponseEntity<HubEpisodeResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubRequest(HttpStatus.CREATED) {
            hubEpisodeService.createEpisode(
                levelKey = levelKey,
                name = request.name,
                description = request.description,
                episodeNumber = request.episodeNumber,
                actorEmail = actorEmail,
            )
        }
    }
}
