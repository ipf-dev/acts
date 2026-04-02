package com.acts.auth.service

import com.acts.auth.api.AuthFailureReason
import com.acts.auth.domain.ActsAuthProperties
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.AuthenticationException
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.web.authentication.AuthenticationFailureHandler
import org.springframework.stereotype.Component
import org.springframework.web.util.UriComponentsBuilder

@Component
class AuthFailureHandler(
    private val authProperties: ActsAuthProperties,
) : AuthenticationFailureHandler {
    override fun onAuthenticationFailure(
        request: HttpServletRequest,
        response: HttpServletResponse,
        exception: AuthenticationException,
    ) {
        val reason = AuthFailureReason.fromCode(
            (exception as? OAuth2AuthenticationException)
                ?.error
                ?.errorCode,
        )

        response.sendRedirect(
            UriComponentsBuilder.fromUriString("${authProperties.frontendBaseUrl.removeSuffix("/")}/")
                .queryParam("loginError", reason.code)
                .build()
                .toUriString(),
        )
    }
}
