package com.acts.auth

import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class AuthEventLogger {
    private val logger = LoggerFactory.getLogger(AuthEventLogger::class.java)

    fun logLoginSuccess(
        request: HttpServletRequest,
        email: String,
        role: UserRole,
    ) {
        logger.info(
            "event=auth_login outcome=success email={} role={} remoteAddress={} userAgent={} requestUri={}",
            email,
            role.name,
            request.remoteAddr.orUnknown(),
            request.getHeader("User-Agent").orUnknown(),
            request.requestURI.orUnknown(),
        )
    }

    private fun String?.orUnknown(): String = if (this.isNullOrBlank()) "unknown" else this
}
