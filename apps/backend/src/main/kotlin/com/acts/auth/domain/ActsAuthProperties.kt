package com.acts.auth.domain

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("acts.auth")
data class ActsAuthProperties(
    val allowedDomain: String = "iportfolio.co.kr",
    val backendBaseUrl: String = "http://localhost:8088",
    val frontendBaseUrl: String = "http://localhost:5173",
)
