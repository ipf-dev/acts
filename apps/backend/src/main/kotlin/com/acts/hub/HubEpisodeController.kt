package com.acts.hub

import com.acts.asset.api.AssetController.Companion.currentActorEmail
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/hub/episodes")
class HubEpisodeController(
    private val hubEpisodeService: HubEpisodeService,
) {
    @DeleteMapping("/{episodeKey}")
    fun deleteEpisode(
        @PathVariable episodeKey: String,
        authentication: Authentication?,
    ): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubVoidRequest {
            hubEpisodeService.deleteEpisode(episodeKey = episodeKey, actorEmail = actorEmail)
        }
    }

    @GetMapping("/{episodeKey}")
    fun getEpisode(
        @PathVariable episodeKey: String,
        authentication: Authentication?,
    ): ResponseEntity<HubEpisodeResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubRequest {
            hubEpisodeService.getEpisode(episodeKey = episodeKey, actorEmail = actorEmail)
        }
    }

    @PutMapping("/{episodeKey}")
    fun updateEpisode(
        @PathVariable episodeKey: String,
        @RequestBody request: HubEpisodeUpsertRequest,
        authentication: Authentication?,
    ): ResponseEntity<HubEpisodeResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubRequest {
            hubEpisodeService.updateEpisode(
                episodeKey = episodeKey,
                name = request.name,
                description = request.description,
                actorEmail = actorEmail,
            )
        }
    }

    @PostMapping("/{episodeKey}/slots")
    fun createSlot(
        @PathVariable episodeKey: String,
        @RequestBody request: HubEpisodeSlotCreateRequest,
        authentication: Authentication?,
    ): ResponseEntity<HubEpisodeSlotResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubRequest(HttpStatus.CREATED) {
            hubEpisodeService.createSlot(
                episodeKey = episodeKey,
                name = request.name,
                actorEmail = actorEmail,
            )
        }
    }

    @DeleteMapping("/{episodeKey}/slots/{slotId}")
    fun deleteSlot(
        @PathVariable episodeKey: String,
        @PathVariable slotId: Long,
        authentication: Authentication?,
    ): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubVoidRequest {
            hubEpisodeService.deleteSlot(
                episodeKey = episodeKey,
                slotId = slotId,
                actorEmail = actorEmail,
            )
        }
    }

    @PutMapping("/{episodeKey}/slots/{slotId}/assets")
    fun assignAssetToSlot(
        @PathVariable episodeKey: String,
        @PathVariable slotId: Long,
        @RequestBody request: HubEpisodeSlotAssetLinkRequest,
        authentication: Authentication?,
    ): ResponseEntity<HubEpisodeSlotResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubRequest {
            hubEpisodeService.assignAssetToSlot(
                episodeKey = episodeKey,
                slotId = slotId,
                assetId = request.assetId,
                actorEmail = actorEmail,
            )
        }
    }

    @DeleteMapping("/{episodeKey}/slots/{slotId}/assets/{assetId}")
    fun removeAssetFromSlot(
        @PathVariable episodeKey: String,
        @PathVariable slotId: Long,
        @PathVariable assetId: Long,
        authentication: Authentication?,
    ): ResponseEntity<HubEpisodeSlotResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubRequest {
            hubEpisodeService.removeAssetFromSlot(
                episodeKey = episodeKey,
                slotId = slotId,
                assetId = assetId,
                actorEmail = actorEmail,
            )
        }
    }
}
