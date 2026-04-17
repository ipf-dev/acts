package com.acts.auth.api

import org.springframework.security.oauth2.core.OAuth2Error

enum class AuthFailureReason(
    val code: String,
    val description: String,
) {
    DOMAIN_MISMATCH(
        code = "domain_mismatch",
        description = "Only accounts from the allowed Google workspace domains may sign in.",
    ),
    ACCOUNT_DEACTIVATED(
        code = "account_deactivated",
        description = "This account has been deactivated. Contact an administrator.",
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
