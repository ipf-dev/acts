package com.acts.asset.api

import com.acts.asset.api.AssetController.Companion.currentActorEmail
import com.acts.asset.api.AssetController.Companion.currentActorName
import com.acts.asset.service.AssetLinkService
import com.acts.asset.service.AssetUploadService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/assets")
class AssetUploadController(
    private val assetUploadService: AssetUploadService,
    private val assetLinkService: AssetLinkService,
) {
    @PostMapping("/upload-intent", consumes = ["application/json"])
    fun initiateUpload(authentication: Authentication?, @RequestBody request: AssetUploadIntentRequest): ResponseEntity<AssetUploadIntentResponse> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)
        return try { ResponseEntity.ok(assetUploadService.initiateUpload(request = request, actorEmail = actorEmail, actorName = actorName))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.BAD_REQUEST).build() }
    }

    @PostMapping("/upload-multipart-intent", consumes = ["application/json"])
    fun initiateMultipartUpload(authentication: Authentication?, @RequestBody request: AssetUploadIntentRequest): ResponseEntity<AssetMultipartUploadIntentResponse> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)
        return try { ResponseEntity.ok(assetUploadService.initiateMultipartUpload(request = request, actorEmail = actorEmail, actorName = actorName))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.BAD_REQUEST).build() }
    }

    @PostMapping("/{assetId}/complete-multipart", consumes = ["application/json"])
    fun completeMultipartUpload(authentication: Authentication?, @PathVariable assetId: Long, @RequestBody request: AssetMultipartUploadCompleteRequest): ResponseEntity<AssetSummaryResponse> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return try { ResponseEntity.ok(assetUploadService.completeMultipartUpload(assetId = assetId, request = request, actorEmail = actorEmail))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalStateException) { ResponseEntity.status(HttpStatus.CONFLICT).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.NOT_FOUND).build() }
    }

    @PostMapping("/links", consumes = ["application/json"])
    fun registerLinks(authentication: Authentication?, @RequestBody request: AssetLinkRegistrationRequest): ResponseEntity<List<AssetSummaryResponse>> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)
        return try { ResponseEntity.ok(assetLinkService.registerLinks(request = request, actorEmail = actorEmail, actorName = actorName))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.BAD_REQUEST).build() }
    }

    @PostMapping("/{assetId}/complete", consumes = ["application/json"])
    fun completeUpload(authentication: Authentication?, @PathVariable assetId: Long, @RequestBody request: AssetUploadCompleteRequest): ResponseEntity<AssetSummaryResponse> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return try { ResponseEntity.ok(assetUploadService.completeUpload(assetId = assetId, request = request, actorEmail = actorEmail))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalStateException) { ResponseEntity.status(HttpStatus.CONFLICT).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.NOT_FOUND).build() }
    }
}
