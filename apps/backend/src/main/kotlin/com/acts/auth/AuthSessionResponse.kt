package com.acts.auth

data class AuthSessionResponse(
    val authenticated: Boolean,
    val loginConfigured: Boolean,
    val allowedDomain: String,
    val allowedFeatureKeys: List<AppFeatureKey>,
    val user: AuthUserProfile?,
)
