package com.acts.auth.domain

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("acts.auth")
data class ActsAuthProperties(
    val allowedDomains: List<String> = listOf("iportfolio.co.kr", "spindlebooks.com"),
    val backendBaseUrl: String = "http://localhost:8088",
    val frontendBaseUrl: String = "http://localhost:5173",
) {
    fun normalizedAllowedDomains(): List<String> = allowedDomains.map { it.lowercase() }

    fun isEmailDomainAllowed(email: String): Boolean {
        val normalizedEmail = email.lowercase()
        return normalizedAllowedDomains().any { normalizedEmail.endsWith("@$it") }
    }
}
