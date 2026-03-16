package com.acts.auth

import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class UserDirectoryService(
    private val authProperties: ActsAuthProperties,
    private val userAccountRepository: UserAccountRepository,
    private val departmentRepository: DepartmentRepository,
    private val teamRepository: TeamRepository,
    private val viewerAllowlistRepository: ViewerAllowlistRepository,
    private val adminAuditLogService: AdminAuditLogService,
) {
    @Transactional
    fun syncLogin(email: String, displayName: String): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val resolvedRole = resolveRole(normalizedEmail)
        val account = userAccountRepository.findById(normalizedEmail)
            .orElseGet {
                UserAccountEntity(
                    email = normalizedEmail,
                    displayName = displayName,
                    role = resolvedRole,
                    mappingMode = UserMappingMode.UNMAPPED,
                    companyWideViewer = resolveCompanyWideViewer(normalizedEmail, resolvedRole),
                )
            }

        account.displayName = displayName.trim()
        account.role = resolvedRole
        account.companyWideViewer = resolveCompanyWideViewer(normalizedEmail, resolvedRole)
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
    fun listTeams(): List<TeamOptionResponse> = teamRepository.findAllByOrderByNameAsc()
        .map { team ->
            TeamOptionResponse(
                id = requireNotNull(team.id),
                name = team.name,
                departmentId = requireNotNull(team.department.id),
            )
        }

    @Transactional
    fun saveManualAssignment(
        email: String,
        departmentId: Long,
        teamId: Long,
        positionTitle: String?,
        actorEmail: String,
        actorName: String?,
    ): AuthUserProfile {
        val normalizedEmail = email.lowercase()
        val resolvedRole = resolveRole(normalizedEmail)
        val account = userAccountRepository.findById(normalizedEmail)
            .orElseGet {
                UserAccountEntity(
                    email = normalizedEmail,
                    displayName = normalizedEmail.substringBefore("@"),
                    role = resolvedRole,
                    mappingMode = UserMappingMode.UNMAPPED,
                    companyWideViewer = resolveCompanyWideViewer(normalizedEmail, resolvedRole),
                )
            }
        val beforeProfile = account.toProfile()
        val department = departmentRepository.findById(departmentId)
            .orElseThrow { IllegalArgumentException("Department does not exist.") }
        val team = teamRepository.findById(teamId)
            .orElseThrow { IllegalArgumentException("Team does not exist.") }

        if (team.department.id != department.id) {
            throw IllegalArgumentException("Team does not belong to department.")
        }

        account.department = department
        account.team = team
        account.positionTitle = positionTitle.normalizedOrNull()
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
    fun listViewerAllowlist(): List<ViewerAllowlistEntryResponse> = viewerAllowlistRepository.findAllByOrderByEmailAsc()
        .map { entry ->
            ViewerAllowlistEntryResponse(
                email = entry.email,
                effectiveCompanyWideViewer = resolveCompanyWideViewer(
                    email = entry.email,
                    role = resolveRole(entry.email),
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

    private fun resolveRole(email: String): UserRole = if (
        authProperties.adminEmails.any { it.equals(email, ignoreCase = true) }
    ) {
        UserRole.ADMIN
    } else {
        UserRole.USER
    }

    private fun resolveCompanyWideViewer(
        email: String,
        role: UserRole,
    ): Boolean = role == UserRole.ADMIN || viewerAllowlistRepository.existsById(email)

    private fun recalculateEffectivePermissions(email: String) {
        val account = userAccountRepository.findById(email).orElse(null) ?: return
        account.role = resolveRole(email)
        account.companyWideViewer = resolveCompanyWideViewer(email, account.role)
        userAccountRepository.save(account)
    }

    private fun validateAllowedDomain(email: String) {
        if (!email.endsWith("@${authProperties.allowedDomain.lowercase()}")) {
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
            ?: resolveCompanyWideViewer(email, resolveRole(email)),
    )
}

private fun UserAccountEntity.toProfile(): AuthUserProfile = AuthUserProfile(
    email = email,
    displayName = displayName,
    departmentId = department?.id,
    departmentName = department?.name,
    teamId = team?.id,
    teamName = team?.name,
    positionTitle = positionTitle,
    mappingMode = mappingMode,
    role = role,
    companyWideViewer = companyWideViewer,
    manualAssignmentRequired = department == null || team == null,
)

private fun String?.normalizedOrNull(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
