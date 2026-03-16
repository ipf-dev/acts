package com.acts.auth

import java.time.Instant

data class ViewerAllowlistEntryResponse(
    val email: String,
    val effectiveCompanyWideViewer: Boolean,
    val createdAt: Instant,
)
