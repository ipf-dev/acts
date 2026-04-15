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
@RequestMapping("/api/hub/series")
class HubSeriesController(
    private val hubStructureService: HubStructureService,
) {
    @PostMapping
    fun createSeries(
        @RequestBody request: HubSeriesCreateRequest,
        authentication: Authentication?,
    ): ResponseEntity<HubSeriesNavigationResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubRequest(HttpStatus.CREATED) {
            hubStructureService.createSeries(
                name = request.name,
                actorEmail = actorEmail,
            )
        }
    }

    @PostMapping("/{seriesKey}/levels")
    fun createLevel(
        @PathVariable seriesKey: String,
        @RequestBody request: HubLevelCreateRequest,
        authentication: Authentication?,
    ): ResponseEntity<HubLevelNavigationResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleHubRequest(HttpStatus.CREATED) {
            hubStructureService.createLevel(
                seriesKey = seriesKey,
                levelNumber = request.levelNumber,
                actorEmail = actorEmail,
            )
        }
    }
}
