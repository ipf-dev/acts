package com.acts.auth

import org.springframework.security.oauth2.core.OAuth2Error

enum class AuthFailureReason(
    val code: String,
    val description: String,
) {
    DOMAIN_MISMATCH(
        code = "domain_mismatch",
        description = "Only @iportfolio.co.kr accounts may sign in.",
    ),
    EMAIL_MISSING(
        code = "email_missing",
        description = "Google did not return an email address.",
    ),
    EMAIL_NOT_VERIFIED(
        code = "email_not_verified",
        description = "The Google account email must be verified.",
    ),
    GOOGLE_OAUTH_NOT_CONFIGURED(
        code = "google_oauth_not_configured",
        description = "Google OAuth client settings are missing.",
    ),
    LOGIN_FAILED(
        code = "login_failed",
        description = "The login attempt could not be completed.",
    ),
    ;

    fun toOAuth2Error(): OAuth2Error = OAuth2Error(code, description, null)

    companion object {
        fun fromCode(code: String?): AuthFailureReason = entries.firstOrNull { it.code == code } ?: LOGIN_FAILED
    }
}
