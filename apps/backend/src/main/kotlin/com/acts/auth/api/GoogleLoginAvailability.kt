package com.acts.auth.api

import org.springframework.core.env.Environment
import org.springframework.stereotype.Component

@Component
class GoogleLoginAvailability(
    private val environment: Environment,
) {
    fun isConfigured(): Boolean = !environment
        .getProperty("spring.security.oauth2.client.registration.google.client-id")
        .isNullOrBlank()
}
