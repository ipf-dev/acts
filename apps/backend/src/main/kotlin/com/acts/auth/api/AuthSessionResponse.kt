package com.acts.auth.api

import com.acts.auth.feature.AppFeatureKey

data class AuthSessionResponse(
    val authenticated: Boolean,
    val loginConfigured: Boolean,
    val allowedDomains: List<String>,
    val allowedFeatureKeys: List<AppFeatureKey>,
    val user: AuthUserProfile?,
)
