package com.acts.auth

import com.acts.auth.feature.AppFeatureKey

data class AuthSessionResponse(
    val authenticated: Boolean,
    val loginConfigured: Boolean,
    val allowedDomain: String,
    val allowedFeatureKeys: List<AppFeatureKey>,
    val user: AuthUserProfile?,
)
