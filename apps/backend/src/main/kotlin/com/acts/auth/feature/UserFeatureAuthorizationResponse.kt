package com.acts.auth.feature

import com.acts.auth.UserRole

data class UserFeatureAuthorizationResponse(
    val email: String,
    val displayName: String,
    val organizationName: String?,
    val positionTitle: String?,
    val role: UserRole,
    val featureAccessLocked: Boolean,
    val allowedFeatures: List<AppFeatureResponse>,
    val deniedFeatures: List<AppFeatureResponse>,
)

class UserFeatureAccessUpdateRequest {
    var allowedFeatureKeys: List<AppFeatureKey> = emptyList()
}
