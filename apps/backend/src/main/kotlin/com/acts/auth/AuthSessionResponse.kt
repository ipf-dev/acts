package com.acts.auth

data class AuthSessionResponse(
    val authenticated: Boolean,
    val loginConfigured: Boolean,
    val allowedDomain: String,
    val user: AuthUserProfile?,
)
