package com.acts.auth

import com.acts.auth.audit.AdminAuditLogAction
import com.acts.auth.audit.AdminAuditLogRepository
import com.acts.auth.domain.UserRole
import com.acts.auth.org.OrganizationEntity
import com.acts.auth.org.OrganizationRepository
import com.acts.auth.user.UserDirectoryService
import com.acts.auth.user.UserMappingMode
import com.acts.support.TEST_ADMIN_EMAIL
import com.acts.support.TEST_ADMIN_NAME
import com.acts.support.TEST_CONTENT_ORG_NAME
import com.acts.support.TEST_CREATOR_EMAIL
import com.acts.support.TEST_CREATOR_NAME
import com.acts.support.TEST_MARKETING_ORG_NAME
import com.acts.support.TEST_NEW_USER_EMAIL
import com.acts.support.TEST_NEW_USER_NAME
import com.acts.support.TEST_SEEDED_MEMBER_EMAIL
import com.acts.support.TEST_SEEDED_MEMBER_NAME
import com.acts.support.TEST_STRATEGY_ORG_NAME
import com.acts.support.TEST_TEMP_VIEWER_EMAIL
import com.acts.support.TEST_TEMP_VIEWER_NAME
import com.acts.support.TEST_VIEWER_EMAIL
import com.acts.support.TEST_VIEWER_NAME
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@Transactional
class UserDirectoryServiceTest @Autowired constructor(
    private val adminAuditLogRepository: AdminAuditLogRepository,
    private val organizationRepository: OrganizationRepository,
    private val userDirectoryService: UserDirectoryService,
) {
    private lateinit var strategyOrganization: OrganizationEntity
    private lateinit var marketingOrganization: OrganizationEntity

    @BeforeEach
    fun loadOrganizations() {
        strategyOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == TEST_STRATEGY_ORG_NAME }
        marketingOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == TEST_MARKETING_ORG_NAME }
    }

    @Test
    fun `requires manual assignment until an admin sets an organization`() {
        val profile = userDirectoryService.syncLogin(
            email = TEST_NEW_USER_EMAIL,
            displayName = TEST_NEW_USER_NAME,
        )

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.UNMAPPED)
        assertThat(profile.organizationName).isNull()
        assertThat(profile.role).isEqualTo(UserRole.USER)
        assertThat(profile.companyWideViewer).isFalse()
        assertThat(profile.manualAssignmentRequired).isTrue()
    }

    @Test
    fun `seeded admin role is loaded from the test bootstrap`() {
        val profile = userDirectoryService.syncLogin(
            email = TEST_ADMIN_EMAIL,
            displayName = TEST_ADMIN_NAME,
        )

        assertThat(profile.role).isEqualTo(UserRole.ADMIN)
        assertThat(profile.companyWideViewer).isTrue()
    }

    @Test
    fun `seeded directory display name is preserved on login`() {
        val profile = userDirectoryService.syncLogin(
            email = TEST_SEEDED_MEMBER_EMAIL,
            displayName = "Overridden Display Name",
        )

        assertThat(profile.displayName).isEqualTo(TEST_SEEDED_MEMBER_NAME)
    }

    @Test
    fun `manual assignment stores organization and records an audit log`() {
        userDirectoryService.syncLogin(
            email = TEST_CREATOR_EMAIL,
            displayName = TEST_CREATOR_NAME,
        )

        val profile = userDirectoryService.saveManualAssignment(
            email = TEST_CREATOR_EMAIL,
            organizationId = marketingOrganization.id!!,
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )

        val auditLogs = userDirectoryService.listAuditLogs()

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.MANUAL)
        assertThat(profile.organizationId).isEqualTo(marketingOrganization.id)
        assertThat(profile.organizationName).isEqualTo(TEST_MARKETING_ORG_NAME)
        assertThat(profile.manualAssignmentRequired).isFalse()

        assertThat(auditLogs).hasSize(1)
        assertThat(auditLogs.single().actionType).isEqualTo(AdminAuditLogAction.USER_ASSIGNMENT_UPDATED.name)
        assertThat(auditLogs.single().actorEmail).isEqualTo(TEST_ADMIN_EMAIL)
        assertThat(auditLogs.single().targetEmail).isEqualTo(TEST_CREATOR_EMAIL)
        assertThat(auditLogs.single().beforeState).contains("\"organizationName\":null")
        assertThat(auditLogs.single().afterState)
            .contains("\"organizationName\":\"$TEST_MARKETING_ORG_NAME\"")
    }

    @Test
    fun `viewer allowlist grants company wide viewer and records an audit log`() {
        userDirectoryService.syncLogin(
            email = TEST_VIEWER_EMAIL,
            displayName = TEST_VIEWER_NAME,
        )

        val allowlistEntries = userDirectoryService.addViewerAllowlist(
            email = TEST_VIEWER_EMAIL,
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )
        val refreshedProfile = userDirectoryService.listKnownUsers()
            .first { user -> user.email == TEST_VIEWER_EMAIL }

        assertThat(allowlistEntries).extracting("email").contains(TEST_VIEWER_EMAIL)
        assertThat(refreshedProfile.companyWideViewer).isTrue()

        val latestAuditLog = userDirectoryService.listAuditLogs().first()
        assertThat(latestAuditLog.actionType).isEqualTo(AdminAuditLogAction.VIEWER_ALLOWLIST_ADDED.name)
        assertThat(latestAuditLog.actorEmail).isEqualTo(TEST_ADMIN_EMAIL)
        assertThat(latestAuditLog.targetEmail).isEqualTo(TEST_VIEWER_EMAIL)
        assertThat(latestAuditLog.beforeState).contains("\"allowlisted\":false")
        assertThat(latestAuditLog.afterState)
            .contains("\"allowlisted\":true")
            .contains("\"effectiveCompanyWideViewer\":true")
    }

    @Test
    fun `removing viewer allowlist recalculates company wide viewer and records an audit log`() {
        userDirectoryService.syncLogin(
            email = TEST_TEMP_VIEWER_EMAIL,
            displayName = TEST_TEMP_VIEWER_NAME,
        )
        userDirectoryService.addViewerAllowlist(
            email = TEST_TEMP_VIEWER_EMAIL,
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )
        adminAuditLogRepository.deleteAll()

        userDirectoryService.removeViewerAllowlist(
            email = TEST_TEMP_VIEWER_EMAIL,
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )

        val refreshedProfile = userDirectoryService.listKnownUsers()
            .first { user -> user.email == TEST_TEMP_VIEWER_EMAIL }
        val latestAuditLog = userDirectoryService.listAuditLogs().first()

        assertThat(refreshedProfile.companyWideViewer).isFalse()
        assertThat(latestAuditLog.actionType).isEqualTo(AdminAuditLogAction.VIEWER_ALLOWLIST_REMOVED.name)
        assertThat(latestAuditLog.targetEmail).isEqualTo(TEST_TEMP_VIEWER_EMAIL)
        assertThat(latestAuditLog.beforeState)
            .contains("\"allowlisted\":true")
            .contains("\"effectiveCompanyWideViewer\":true")
        assertThat(latestAuditLog.afterState)
            .contains("\"allowlisted\":false")
            .contains("\"effectiveCompanyWideViewer\":false")
    }

    @Test
    fun `promoting a user to admin updates the role and records an audit log`() {
        userDirectoryService.syncLogin(
            email = TEST_CREATOR_EMAIL,
            displayName = TEST_CREATOR_NAME,
        )

        val promotedProfile = userDirectoryService.promoteUserToAdmin(
            email = TEST_CREATOR_EMAIL,
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )
        val latestAuditLog = userDirectoryService.listAuditLogs().first()

        assertThat(promotedProfile.role).isEqualTo(UserRole.ADMIN)
        assertThat(promotedProfile.companyWideViewer).isTrue()
        assertThat(latestAuditLog.actionType).isEqualTo(AdminAuditLogAction.USER_ROLE_PROMOTED.name)
        assertThat(latestAuditLog.actorEmail).isEqualTo(TEST_ADMIN_EMAIL)
        assertThat(latestAuditLog.targetEmail).isEqualTo(TEST_CREATOR_EMAIL)
        assertThat(latestAuditLog.beforeState)
            .contains("\"role\":\"USER\"")
            .contains("\"companyWideViewer\":false")
        assertThat(latestAuditLog.afterState)
            .contains("\"role\":\"ADMIN\"")
            .contains("\"companyWideViewer\":true")
    }

    @Test
    fun `lists test organizations for manual assignment options`() {
        val organizations = userDirectoryService.listOrganizations()

        assertThat(organizations).extracting("name")
            .contains(TEST_STRATEGY_ORG_NAME, TEST_CONTENT_ORG_NAME, TEST_MARKETING_ORG_NAME)

        assertThat(
            organizations.first { organization -> organization.name == TEST_STRATEGY_ORG_NAME }.id,
        ).isEqualTo(strategyOrganization.id)
    }
}
