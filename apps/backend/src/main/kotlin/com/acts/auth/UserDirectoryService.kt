package com.acts.auth

import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class UserDirectoryService(
    private val authProperties: ActsAuthProperties,
    private val userAccountRepository: UserAccountRepository,
    private val departmentRepository: DepartmentRepository,
) {
    @Transactional
    fun syncLogin(email: String, displayName: String): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val account = userAccountRepository.findById(normalizedEmail)
            .orElseGet {
                UserAccountEntity(
                    email = normalizedEmail,
                    displayName = displayName,
                    role = resolveRole(normalizedEmail),
                    mappingMode = UserMappingMode.UNMAPPED,
                    companyWideViewer = resolveRole(normalizedEmail) == UserRole.ADMIN,
                )
            }

        account.displayName = displayName.trim()
        account.role = resolveRole(normalizedEmail)
        if (account.role == UserRole.ADMIN) {
            account.companyWideViewer = true
        }
        account.lastLoginAt = Instant.now()

        return userAccountRepository.save(account).toProfile()
    }

    @Transactional
    fun listKnownUsers(): List<AuthUserProfile> = userAccountRepository.findAllByOrderByDisplayNameAscEmailAsc()
        .map { it.toProfile() }

    @Transactional
    fun listDepartments(): List<DepartmentOptionResponse> = departmentRepository.findAllByOrderByNameAsc()
        .map { department ->
            DepartmentOptionResponse(
                id = requireNotNull(department.id),
                name = department.name,
            )
        }

    @Transactional
    fun saveManualAssignment(
        email: String,
        departmentId: Long,
        positionTitle: String?,
    ): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val account = userAccountRepository.findById(normalizedEmail)
            .orElseGet {
                UserAccountEntity(
                    email = normalizedEmail,
                    displayName = normalizedEmail.substringBefore("@"),
                    role = resolveRole(normalizedEmail),
                    mappingMode = UserMappingMode.UNMAPPED,
                    companyWideViewer = resolveRole(normalizedEmail) == UserRole.ADMIN,
                )
            }
        val department = departmentRepository.findById(departmentId)
            .orElseThrow { IllegalArgumentException("Department does not exist.") }

        account.department = department
        account.positionTitle = positionTitle.normalizedOrNull()
        account.mappingMode = UserMappingMode.MANUAL

        return userAccountRepository.save(account).toProfile()
    }

    private fun resolveRole(email: String): UserRole = if (
        authProperties.adminEmails.any { it.equals(email, ignoreCase = true) }
    ) {
        UserRole.ADMIN
    } else {
        UserRole.USER
    }
}

private fun UserAccountEntity.toProfile(): AuthUserProfile = AuthUserProfile(
    email = email,
    displayName = displayName,
    departmentId = department?.id,
    departmentName = department?.name,
    positionTitle = positionTitle,
    mappingMode = mappingMode,
    role = role,
    companyWideViewer = companyWideViewer,
    manualAssignmentRequired = department == null,
)

private fun String?.normalizedOrNull(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
