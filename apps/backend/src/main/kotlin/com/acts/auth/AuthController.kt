package com.acts.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authProperties: ActsAuthProperties,
    private val userDirectoryService: UserDirectoryService,
    private val googleLoginAvailability: GoogleLoginAvailability,
) {
    @GetMapping("/login/google")
    fun startGoogleLogin(response: HttpServletResponse) {
        val redirectTarget = if (googleLoginAvailability.isConfigured()) {
            "${authProperties.backendBaseUrl.removeSuffix("/")}/oauth2/authorization/google"
        } else {
            "${authProperties.frontendBaseUrl.removeSuffix("/")}/?loginError=${AuthFailureReason.GOOGLE_OAUTH_NOT_CONFIGURED.code}"
        }

        response.sendRedirect(redirectTarget)
    }

    @GetMapping("/me")
    fun getSession(authentication: Authentication?): AuthSessionResponse {
        val oidcUser = authentication?.principal as? OidcUser
            ?: return AuthSessionResponse(
                authenticated = false,
                loginConfigured = googleLoginAvailability.isConfigured(),
                allowedDomain = authProperties.allowedDomain,
                user = null,
            )

        val email = oidcUser.email?.lowercase()
            ?: return AuthSessionResponse(
                authenticated = false,
                loginConfigured = googleLoginAvailability.isConfigured(),
                allowedDomain = authProperties.allowedDomain,
                user = null,
            )

        val displayName = oidcUser.fullName ?: oidcUser.givenName ?: email.substringBefore("@")

        return AuthSessionResponse(
            authenticated = true,
            loginConfigured = googleLoginAvailability.isConfigured(),
            allowedDomain = authProperties.allowedDomain,
            user = userDirectoryService.syncLogin(
                email = email,
                displayName = displayName,
            ),
        )
    }

    @PostMapping("/logout")
    fun logout(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication?,
    ): ResponseEntity<Void> {
        SecurityContextLogoutHandler().logout(request, response, authentication)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/admin/users")
    fun listUsers(): List<AuthUserProfile> = userDirectoryService.listKnownUsers()

    @GetMapping("/admin/organizations")
    fun listOrganizations(): List<OrganizationOptionResponse> = userDirectoryService.listOrganizations()

    @GetMapping("/admin/viewer-allowlist")
    fun listViewerAllowlist(): List<ViewerAllowlistEntryResponse> = userDirectoryService.listViewerAllowlist()

    @PostMapping("/admin/viewer-allowlist")
    fun addViewerAllowlist(
        @RequestBody request: ViewerAllowlistRequest,
        authentication: Authentication?,
    ): ResponseEntity<List<ViewerAllowlistEntryResponse>> {
        if (request.email.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        return try {
            ResponseEntity.ok(
                userDirectoryService.addViewerAllowlist(
                    email = request.email.trim(),
                    actorEmail = currentActorEmail(authentication),
                    actorName = currentActorName(authentication),
                ),
            )
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    @DeleteMapping("/admin/viewer-allowlist/{email}")
    fun removeViewerAllowlist(
        @PathVariable email: String,
        authentication: Authentication?,
    ): List<ViewerAllowlistEntryResponse> = userDirectoryService.removeViewerAllowlist(
        email = email,
        actorEmail = currentActorEmail(authentication),
        actorName = currentActorName(authentication),
    )

    @GetMapping("/admin/audit-logs")
    fun listAuditLogs(): List<AuditLogResponse> = userDirectoryService.listAuditLogs()

    @PutMapping("/admin/users/{email}/assignment")
    fun updateManualAssignment(
        @PathVariable email: String,
        @RequestBody request: ManualAssignmentRequest,
        authentication: Authentication?,
    ): ResponseEntity<AuthUserProfile> {
        if (request.organizationId <= 0L) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }

        return try {
            ResponseEntity.ok(
                userDirectoryService.saveManualAssignment(
                    email = email,
                    organizationId = request.organizationId,
                    positionTitle = request.positionTitle,
                    actorEmail = currentActorEmail(authentication),
                    actorName = currentActorName(authentication),
                ),
            )
        } catch (_: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
    }

    private fun currentActorEmail(authentication: Authentication?): String = authentication?.name?.lowercase() ?: "system"

    private fun currentActorName(authentication: Authentication?): String = when (val principal = authentication?.principal) {
        is OidcUser -> principal.fullName ?: principal.givenName ?: principal.email ?: authentication.name
        else -> authentication?.name?.substringBefore("@") ?: "시스템"
    }
}
