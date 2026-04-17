package com.acts.auth.user

import com.acts.auth.domain.ActsAuthProperties
import com.acts.auth.api.AuthUserProfile
import com.acts.auth.domain.UserRole
import com.acts.auth.allowlist.ViewerAllowlistEntity
import com.acts.auth.allowlist.ViewerAllowlistEntryResponse
import com.acts.auth.allowlist.ViewerAllowlistRepository
import com.acts.auth.audit.AdminAuditLogService
import com.acts.auth.audit.AuditLogResponse
import com.acts.auth.audit.ViewerAllowlistAuditSnapshot
import com.acts.auth.org.OrganizationOptionResponse
import com.acts.auth.org.OrganizationRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class UserDirectoryService(
    private val authProperties: ActsAuthProperties,
    private val userAccountRepository: UserAccountRepository,
    private val organizationRepository: OrganizationRepository,
    private val viewerAllowlistRepository: ViewerAllowlistRepository,
    private val adminAuditLogService: AdminAuditLogService,
) {
    @Transactional
    fun syncLogin(email: String, displayName: String): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val resolvedDisplayName = displayName.trim().ifBlank { normalizedEmail.substringBefore("@") }
        val existingAccount = userAccountRepository.findById(normalizedEmail).orElse(null)

        if (existingAccount?.deactivatedAt != null) {
            throw UserAccountDeactivatedException(normalizedEmail)
        }

        val resolvedRole = existingAccount?.role ?: UserRole.USER
        val account = existingAccount ?: UserAccountEntity(
            email = normalizedEmail,
            displayName = resolvedDisplayName,
            role = resolvedRole,
            mappingMode = UserMappingMode.UNMAPPED,
            companyWideViewer = resolveCompanyWideViewer(normalizedEmail, resolvedRole),
        )

        if (account.displayName.isBlank()) {
            account.displayName = resolvedDisplayName
        }
        account.role = resolvedRole
        account.companyWideViewer = resolveCompanyWideViewer(normalizedEmail, resolvedRole)
        account.lastLoginAt = Instant.now()

        return userAccountRepository.save(account).toProfile()
    }

    @Transactional
    fun renameUser(
        email: String,
        displayName: String,
        actorEmail: String,
        actorName: String?,
    ): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val trimmedName = displayName.trim()
        if (trimmedName.isBlank()) {
            throw IllegalArgumentException("사용자 이름을 입력해주세요.")
        }

        val account = userAccountRepository.findById(normalizedEmail)
            .orElseThrow { IllegalArgumentException("변경할 사용자를 찾을 수 없습니다.") }
        val beforeProfile = account.toProfile()

        if (account.displayName == trimmedName) {
            return beforeProfile
        }

        account.displayName = trimmedName
        val savedProfile = userAccountRepository.save(account).toProfile()

        adminAuditLogService.recordUserDisplayNameUpdated(
            actorEmail = actorEmail,
            actorName = actorName,
            beforeProfile = beforeProfile,
            afterProfile = savedProfile,
        )

        return savedProfile
    }

    @Transactional
    fun deactivateUser(
        email: String,
        actorEmail: String,
        actorName: String?,
    ): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        if (normalizedEmail == actorEmail.lowercase()) {
            throw IllegalArgumentException("본인 계정은 삭제할 수 없습니다.")
        }

        val account = userAccountRepository.findById(normalizedEmail)
            .orElseThrow { IllegalArgumentException("삭제할 사용자를 찾을 수 없습니다.") }
        val beforeProfile = account.toProfile()

        if (account.deactivatedAt != null) {
            return beforeProfile
        }

        account.deactivatedAt = Instant.now()
        val savedProfile = userAccountRepository.save(account).toProfile()

        adminAuditLogService.recordUserDeleted(
            actorEmail = actorEmail,
            actorName = actorName,
            beforeProfile = beforeProfile,
        )

        return savedProfile
    }

    @Transactional
    fun reactivateUser(
        email: String,
        actorEmail: String,
        actorName: String?,
    ): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val account = userAccountRepository.findById(normalizedEmail)
            .orElseThrow { IllegalArgumentException("복구할 사용자를 찾을 수 없습니다.") }
        val beforeProfile = account.toProfile()

        if (account.deactivatedAt == null) {
            return beforeProfile
        }

        account.deactivatedAt = null
        val savedProfile = userAccountRepository.save(account).toProfile()

        adminAuditLogService.recordUserReactivated(
            actorEmail = actorEmail,
            actorName = actorName,
            afterProfile = savedProfile,
        )

        return savedProfile
    }

    @Transactional
    fun listKnownUsers(): List<AuthUserProfile> = userAccountRepository.findAllByOrderByDisplayNameAscEmailAsc()
        .map { it.toProfile() }

    @Transactional
    fun listOrganizations(): List<OrganizationOptionResponse> = organizationRepository.findAllByOrderByNameAsc()
        .map { organization ->
            OrganizationOptionResponse(
                id = requireNotNull(organization.id),
                name = organization.name,
            )
        }

    @Transactional
    fun saveManualAssignment(
        email: String,
        organizationId: Long,
        actorEmail: String,
        actorName: String?,
    ): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val existingAccount = userAccountRepository.findById(normalizedEmail).orElse(null)
        val resolvedRole = existingAccount?.role ?: UserRole.USER
        val account = existingAccount ?: UserAccountEntity(
            email = normalizedEmail,
            displayName = normalizedEmail.substringBefore("@"),
            role = resolvedRole,
            mappingMode = UserMappingMode.UNMAPPED,
            companyWideViewer = resolveCompanyWideViewer(normalizedEmail, resolvedRole),
        )
        val beforeProfile = account.toProfile()
        val organization = organizationRepository.findById(organizationId)
            .orElseThrow { IllegalArgumentException("Organization does not exist.") }

        account.organization = organization
        account.mappingMode = UserMappingMode.MANUAL
        account.role = resolvedRole
        account.companyWideViewer = resolveCompanyWideViewer(normalizedEmail, resolvedRole)

        val savedProfile = userAccountRepository.save(account).toProfile()
        adminAuditLogService.recordUserAssignmentChange(
            actorEmail = actorEmail,
            actorName = actorName,
            beforeProfile = beforeProfile,
            afterProfile = savedProfile,
        )

        return savedProfile
    }

    @Transactional
    fun promoteUserToAdmin(
        email: String,
        actorEmail: String,
        actorName: String?,
    ): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val account = userAccountRepository.findById(normalizedEmail)
            .orElseThrow { IllegalArgumentException("승격할 사용자를 찾을 수 없습니다.") }
        val beforeProfile = account.toProfile()

        if (account.role == UserRole.ADMIN) {
            return beforeProfile
        }

        account.role = UserRole.ADMIN
        account.companyWideViewer = true

        val savedProfile = userAccountRepository.save(account).toProfile()
        adminAuditLogService.recordUserRolePromoted(
            actorEmail = actorEmail,
            actorName = actorName,
            beforeProfile = beforeProfile,
            afterProfile = savedProfile,
        )

        return savedProfile
    }

    @Transactional
    fun listViewerAllowlist(): List<ViewerAllowlistEntryResponse> = viewerAllowlistRepository.findAllByOrderByEmailAsc()
        .map { entry ->
            val account = userAccountRepository.findById(entry.email).orElse(null)
            ViewerAllowlistEntryResponse(
                email = entry.email,
                effectiveCompanyWideViewer = resolveCompanyWideViewer(
                    email = entry.email,
                    role = account?.role ?: UserRole.USER,
                ),
                createdAt = entry.createdAt,
            )
        }

    @Transactional
    fun addViewerAllowlist(
        email: String,
        actorEmail: String,
        actorName: String?,
    ): List<ViewerAllowlistEntryResponse> {
        val normalizedEmail = email.lowercase()
        validateAllowedDomain(normalizedEmail)

        val existingAccount = userAccountRepository.findById(normalizedEmail).orElse(null)
        val beforeState = viewerAllowlistAuditSnapshot(normalizedEmail, existingAccount)
        val existed = viewerAllowlistRepository.existsById(normalizedEmail)

        if (!existed) {
            viewerAllowlistRepository.save(ViewerAllowlistEntity(email = normalizedEmail))
            recalculateEffectivePermissions(normalizedEmail)
            adminAuditLogService.recordViewerAllowlistAdded(
                actorEmail = actorEmail,
                actorName = actorName,
                targetEmail = normalizedEmail,
                targetName = existingAccount?.displayName,
                beforeState = beforeState,
                afterState = viewerAllowlistAuditSnapshot(
                    normalizedEmail,
                    userAccountRepository.findById(normalizedEmail).orElse(existingAccount),
                ),
            )
        }

        return listViewerAllowlist()
    }

    @Transactional
    fun removeViewerAllowlist(
        email: String,
        actorEmail: String,
        actorName: String?,
    ): List<ViewerAllowlistEntryResponse> {
        val normalizedEmail = email.lowercase()
        val existingEntry = viewerAllowlistRepository.findById(normalizedEmail).orElse(null)
            ?: return listViewerAllowlist()
        val existingAccount = userAccountRepository.findById(normalizedEmail).orElse(null)
        val beforeState = viewerAllowlistAuditSnapshot(normalizedEmail, existingAccount)

        viewerAllowlistRepository.delete(existingEntry)
        recalculateEffectivePermissions(normalizedEmail)

        adminAuditLogService.recordViewerAllowlistRemoved(
            actorEmail = actorEmail,
            actorName = actorName,
            targetEmail = normalizedEmail,
            targetName = existingAccount?.displayName,
            beforeState = beforeState,
            afterState = viewerAllowlistAuditSnapshot(
                normalizedEmail,
                userAccountRepository.findById(normalizedEmail).orElse(existingAccount),
            ),
        )

        return listViewerAllowlist()
    }

    @Transactional
    fun listAuditLogs(): List<AuditLogResponse> = adminAuditLogService.listRecentLogs()

    private fun resolveCompanyWideViewer(
        email: String,
        role: UserRole,
    ): Boolean = role == UserRole.ADMIN || viewerAllowlistRepository.existsById(email)

    private fun recalculateEffectivePermissions(email: String) {
        val account = userAccountRepository.findById(email).orElse(null) ?: return
        account.companyWideViewer = resolveCompanyWideViewer(email, account.role)
        userAccountRepository.save(account)
    }

    private fun validateAllowedDomain(email: String) {
        if (!authProperties.isEmailDomainAllowed(email)) {
            throw IllegalArgumentException("Only the internal domain can be allowlisted.")
        }
    }

    private fun viewerAllowlistAuditSnapshot(
        email: String,
        account: UserAccountEntity?,
    ): ViewerAllowlistAuditSnapshot = ViewerAllowlistAuditSnapshot(
        email = email,
        allowlisted = viewerAllowlistRepository.existsById(email),
        effectiveCompanyWideViewer = account?.let { resolveCompanyWideViewer(email, it.role) }
            ?: resolveCompanyWideViewer(email, UserRole.USER),
    )
}

private fun UserAccountEntity.toProfile(): AuthUserProfile = AuthUserProfile(
    email = email,
    displayName = displayName,
    organizationId = organization?.id,
    organizationName = organization?.name,
    mappingMode = mappingMode,
    role = role,
    companyWideViewer = companyWideViewer,
    manualAssignmentRequired = organization == null,
    deactivatedAt = deactivatedAt,
)
