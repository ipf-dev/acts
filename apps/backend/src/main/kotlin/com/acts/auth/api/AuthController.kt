package com.acts.auth.api

import com.acts.auth.domain.ActsAuthProperties
import com.acts.auth.feature.UserFeatureAccessService
import com.acts.auth.user.UserDirectoryService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authProperties: ActsAuthProperties,
    private val userDirectoryService: UserDirectoryService,
    private val userFeatureAccessService: UserFeatureAccessService,
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
                authenticated = false, loginConfigured = googleLoginAvailability.isConfigured(),
                allowedDomain = authProperties.allowedDomain, allowedFeatureKeys = emptyList(), user = null,
            )

        val email = oidcUser.email?.lowercase()
            ?: return AuthSessionResponse(
                authenticated = false, loginConfigured = googleLoginAvailability.isConfigured(),
                allowedDomain = authProperties.allowedDomain, allowedFeatureKeys = emptyList(), user = null,
            )

        val displayName = oidcUser.fullName ?: oidcUser.givenName ?: email.substringBefore("@")
        val userProfile = userDirectoryService.syncLogin(email = email, displayName = displayName)

        return AuthSessionResponse(
            authenticated = true, loginConfigured = googleLoginAvailability.isConfigured(),
            allowedDomain = authProperties.allowedDomain,
            allowedFeatureKeys = userFeatureAccessService.resolveAllowedFeatureKeys(email = email, role = userProfile.role),
            user = userProfile,
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
}
