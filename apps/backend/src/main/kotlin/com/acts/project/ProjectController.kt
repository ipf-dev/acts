package com.acts.project

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
@RequestMapping("/api/projects")
class ProjectController(
    private val projectService: ProjectService,
) {
    @GetMapping("/navigation")
    fun getNavigation(
        authentication: Authentication?,
    ): ResponseEntity<ProjectNavigationResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleProjectRequest {
            projectService.listNavigation(actorEmail = actorEmail)
        }
    }

    @GetMapping("/organizations")
    fun getOrganizations(
        authentication: Authentication?,
    ): ResponseEntity<List<ProjectOrganizationResponse>> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleProjectRequest {
            projectService.listOrganizations(actorEmail = actorEmail)
        }
    }

    @PostMapping
    fun createProject(
        @RequestBody request: ProjectCreateRequest,
        authentication: Authentication?,
    ): ResponseEntity<ProjectDetailResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleProjectRequest(HttpStatus.CREATED) {
            projectService.createProject(request = request, actorEmail = actorEmail)
        }
    }

    @GetMapping("/{projectKey}")
    fun getProject(
        @PathVariable projectKey: String,
        authentication: Authentication?,
    ): ResponseEntity<ProjectDetailResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleProjectRequest {
            projectService.getProject(projectKey = projectKey, actorEmail = actorEmail)
        }
    }

    @PutMapping("/{projectKey}")
    fun updateProject(
        @PathVariable projectKey: String,
        @RequestBody request: ProjectUpdateRequest,
        authentication: Authentication?,
    ): ResponseEntity<ProjectDetailResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleProjectRequest {
            projectService.updateProject(
                projectKey = projectKey,
                request = request,
                actorEmail = actorEmail,
            )
        }
    }

    @DeleteMapping("/{projectKey}")
    fun deleteProject(
        @PathVariable projectKey: String,
        authentication: Authentication?,
    ): ResponseEntity<Void> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleProjectVoidRequest {
            projectService.deleteProject(projectKey = projectKey, actorEmail = actorEmail)
        }
    }

    @PostMapping("/{projectKey}/assets")
    fun linkAsset(
        @PathVariable projectKey: String,
        @RequestBody request: ProjectAssetLinkRequest,
        authentication: Authentication?,
    ): ResponseEntity<ProjectDetailResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleProjectRequest {
            projectService.linkAsset(
                projectKey = projectKey,
                assetId = request.assetId,
                actorEmail = actorEmail,
            )
        }
    }

    @DeleteMapping("/{projectKey}/assets/{assetId}")
    fun unlinkAsset(
        @PathVariable projectKey: String,
        @PathVariable assetId: Long,
        authentication: Authentication?,
    ): ResponseEntity<ProjectDetailResponse> {
        val actorEmail = currentActorEmail(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return handleProjectRequest {
            projectService.unlinkAsset(
                projectKey = projectKey,
                assetId = assetId,
                actorEmail = actorEmail,
            )
        }
    }
}
