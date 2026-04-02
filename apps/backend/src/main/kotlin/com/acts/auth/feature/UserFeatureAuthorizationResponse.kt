package com.acts.auth.feature

import com.acts.auth.domain.UserRole

data class UserFeatureAuthorizationResponse(
    val email: String,
    val displayName: String,
    val organizationName: String?,
    val role: UserRole,
    val featureAccessLocked: Boolean,
    val allowedFeatures: List<AppFeatureResponse>,
    val deniedFeatures: List<AppFeatureResponse>,
)

class UserFeatureAccessUpdateRequest {
    var allowedFeatureKeys: List<AppFeatureKey> = emptyList()
}
