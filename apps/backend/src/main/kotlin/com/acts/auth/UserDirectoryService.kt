package com.acts.auth

import org.springframework.stereotype.Service
import java.util.concurrent.ConcurrentHashMap

@Service
class UserDirectoryService(
    private val authProperties: ActsAuthProperties,
) {
    private val knownUsers = ConcurrentHashMap<String, AuthUserProfile>()
    private val manualAssignments = ConcurrentHashMap<String, UserAssignment>()

    fun syncLogin(email: String, displayName: String): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val resolvedProfile = resolveProfile(
            email = normalizedEmail,
            displayName = displayName,
        )

        knownUsers[normalizedEmail] = resolvedProfile
        return resolvedProfile
    }

    fun listKnownUsers(): List<AuthUserProfile> = knownUsers.values
        .sortedBy { it.email }

    fun saveManualAssignment(
        email: String,
        teamName: String,
        departmentName: String,
    ): AuthUserProfile {
        val normalizedEmail = email.lowercase()

        manualAssignments[normalizedEmail] = UserAssignment(
            teamName = teamName.trim(),
            departmentName = departmentName.trim(),
            mappingMode = UserMappingMode.MANUAL,
        )

        val displayName = knownUsers[normalizedEmail]?.displayName
            ?: normalizedEmail.substringBefore("@")

        val resolvedProfile = resolveProfile(
            email = normalizedEmail,
            displayName = displayName,
        )

        knownUsers[normalizedEmail] = resolvedProfile
        return resolvedProfile
    }

    private fun resolveProfile(
        email: String,
        displayName: String,
    ): AuthUserProfile {
        val assignment = manualAssignments[email]
            ?: UserAssignment(
                teamName = "Pending assignment",
                departmentName = "Pending assignment",
                mappingMode = UserMappingMode.UNMAPPED,
            )

        val role = if (authProperties.adminEmails.any { it.equals(email, ignoreCase = true) }) {
            UserRole.ADMIN
        } else {
            UserRole.USER
        }

        return AuthUserProfile(
            email = email,
            displayName = displayName,
            teamName = assignment.teamName,
            departmentName = assignment.departmentName,
            mappingMode = assignment.mappingMode,
            role = role,
            manualAssignmentRequired = assignment.mappingMode == UserMappingMode.UNMAPPED,
        )
    }
}

private data class UserAssignment(
    val teamName: String,
    val departmentName: String,
    val mappingMode: UserMappingMode,
)
