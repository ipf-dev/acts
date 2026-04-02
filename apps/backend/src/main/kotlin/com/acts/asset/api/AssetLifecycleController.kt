package com.acts.asset.api

import com.acts.asset.api.AssetController.Companion.currentActorEmail
import com.acts.asset.api.AssetController.Companion.currentActorName
import com.acts.asset.retention.AssetRetentionPolicyResponse
import com.acts.asset.service.AssetLifecycleService
import com.acts.asset.retention.AssetRetentionPolicyUpdateRequest
import com.acts.asset.retention.DeletedAssetSummaryResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/assets")
class AssetLifecycleController(
    private val assetLifecycleService: AssetLifecycleService,
) {
    @GetMapping("/deleted")
    fun listDeletedAssets(authentication: Authentication?): ResponseEntity<List<DeletedAssetSummaryResponse>> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return try { ResponseEntity.ok(assetLifecycleService.listDeletedAssets(actorEmail))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build() }
    }

    @PostMapping("/{assetId}/restore")
    fun restoreAsset(authentication: Authentication?, @PathVariable assetId: Long): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)
        return try {
            assetLifecycleService.restoreAsset(assetId = assetId, actorEmail = actorEmail, actorName = actorName)
            ResponseEntity.noContent().build()
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalStateException) { ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.NOT_FOUND).build() }
    }

    @GetMapping("/policy")
    fun getRetentionPolicy(authentication: Authentication?): ResponseEntity<AssetRetentionPolicyResponse> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return try { ResponseEntity.ok(assetLifecycleService.getRetentionPolicy(actorEmail))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalStateException) { ResponseEntity.status(HttpStatus.NOT_FOUND).build() }
    }

    @PutMapping("/policy")
    fun updateRetentionPolicy(authentication: Authentication?, @RequestBody request: AssetRetentionPolicyUpdateRequest): ResponseEntity<AssetRetentionPolicyResponse> {
        val actorEmail = currentActorEmail(authentication) ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val actorName = currentActorName(authentication)
        return try { ResponseEntity.ok(assetLifecycleService.updateRetentionPolicy(request = request, actorEmail = actorEmail, actorName = actorName))
        } catch (_: SecurityException) { ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        } catch (_: IllegalArgumentException) { ResponseEntity.status(HttpStatus.BAD_REQUEST).build() }
    }
}
