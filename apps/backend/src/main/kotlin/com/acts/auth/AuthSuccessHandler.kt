package com.acts.auth

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component
import org.springframework.web.util.UriComponentsBuilder

@Component
class AuthSuccessHandler(
    private val authProperties: ActsAuthProperties,
    private val authEventLogger: AuthEventLogger,
) : AuthenticationSuccessHandler {
    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication,
    ) {
        val email = (authentication.principal as? OidcUser)?.email?.lowercase() ?: authentication.name.lowercase()
        val role = if (authentication.authorities.any { it.authority == "ROLE_ADMIN" }) {
            UserRole.ADMIN
        } else {
            UserRole.USER
        }

        authEventLogger.logLoginSuccess(
            request = request,
            email = email,
            role = role,
        )

        response.sendRedirect(
            UriComponentsBuilder.fromUriString("${authProperties.frontendBaseUrl.removeSuffix("/")}/")
                .queryParam("login", "success")
                .build()
                .toUriString(),
        )
    }
}
