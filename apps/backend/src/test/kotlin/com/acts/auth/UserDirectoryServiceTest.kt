package com.acts.auth

import com.acts.auth.audit.AdminAuditLogAction
import com.acts.auth.audit.AdminAuditLogRepository
import com.acts.auth.org.OrganizationEntity
import com.acts.auth.org.OrganizationRepository
import com.acts.auth.user.UserDirectoryService
import com.acts.auth.user.UserMappingMode
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
            .first { organization -> organization.name == "AI전략사업팀" }
        marketingOrganization = organizationRepository.findAllByOrderByNameAsc()
            .first { organization -> organization.name == "마케팅팀" }
    }

    @Test
    fun `requires manual assignment until an admin sets an organization`() {
        val profile = userDirectoryService.syncLogin(
            email = "unknown@iportfolio.co.kr",
            displayName = "Unknown",
        )

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.UNMAPPED)
        assertThat(profile.organizationName).isNull()
        assertThat(profile.companyWideViewer).isFalse()
        assertThat(profile.manualAssignmentRequired).isTrue()
    }

    @Test
    fun `manual assignment stores organization and records an audit log`() {
        userDirectoryService.syncLogin(
            email = "coco@iportfolio.co.kr",
            displayName = "Coco",
        )

        val profile = userDirectoryService.saveManualAssignment(
            email = "coco@iportfolio.co.kr",
            organizationId = marketingOrganization.id!!,
            actorEmail = "minsungkim@iportfolio.co.kr",
            actorName = "Min Sung Kim",
        )

        val auditLogs = userDirectoryService.listAuditLogs()

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.MANUAL)
        assertThat(profile.organizationId).isEqualTo(marketingOrganization.id)
        assertThat(profile.organizationName).isEqualTo("마케팅팀")
        assertThat(profile.manualAssignmentRequired).isFalse()

        assertThat(auditLogs).hasSize(1)
        assertThat(auditLogs.single().actionType).isEqualTo(AdminAuditLogAction.USER_ASSIGNMENT_UPDATED.name)
        assertThat(auditLogs.single().actorEmail).isEqualTo("minsungkim@iportfolio.co.kr")
        assertThat(auditLogs.single().targetEmail).isEqualTo("coco@iportfolio.co.kr")
        assertThat(auditLogs.single().beforeState).contains("\"organizationName\":null")
        assertThat(auditLogs.single().afterState)
            .contains("\"organizationName\":\"마케팅팀\"")
    }

    @Test
    fun `viewer allowlist grants company wide viewer and records an audit log`() {
        userDirectoryService.syncLogin(
            email = "leader@iportfolio.co.kr",
            displayName = "Leader",
        )

        val allowlistEntries = userDirectoryService.addViewerAllowlist(
            email = "leader@iportfolio.co.kr",
            actorEmail = "minsungkim@iportfolio.co.kr",
            actorName = "Min Sung Kim",
        )
        val refreshedProfile = userDirectoryService.listKnownUsers()
            .first { user -> user.email == "leader@iportfolio.co.kr" }

        assertThat(allowlistEntries).extracting("email").contains("leader@iportfolio.co.kr")
        assertThat(refreshedProfile.companyWideViewer).isTrue()

        val latestAuditLog = userDirectoryService.listAuditLogs().first()
        assertThat(latestAuditLog.actionType).isEqualTo(AdminAuditLogAction.VIEWER_ALLOWLIST_ADDED.name)
        assertThat(latestAuditLog.actorEmail).isEqualTo("minsungkim@iportfolio.co.kr")
        assertThat(latestAuditLog.targetEmail).isEqualTo("leader@iportfolio.co.kr")
        assertThat(latestAuditLog.beforeState).contains("\"allowlisted\":false")
        assertThat(latestAuditLog.afterState)
            .contains("\"allowlisted\":true")
            .contains("\"effectiveCompanyWideViewer\":true")
    }

    @Test
    fun `removing viewer allowlist recalculates company wide viewer and records an audit log`() {
        userDirectoryService.syncLogin(
            email = "viewer@iportfolio.co.kr",
            displayName = "Viewer",
        )
        userDirectoryService.addViewerAllowlist(
            email = "viewer@iportfolio.co.kr",
            actorEmail = "minsungkim@iportfolio.co.kr",
            actorName = "Min Sung Kim",
        )
        adminAuditLogRepository.deleteAll()

        userDirectoryService.removeViewerAllowlist(
            email = "viewer@iportfolio.co.kr",
            actorEmail = "minsungkim@iportfolio.co.kr",
            actorName = "Min Sung Kim",
        )

        val refreshedProfile = userDirectoryService.listKnownUsers()
            .first { user -> user.email == "viewer@iportfolio.co.kr" }
        val latestAuditLog = userDirectoryService.listAuditLogs().first()

        assertThat(refreshedProfile.companyWideViewer).isFalse()
        assertThat(latestAuditLog.actionType).isEqualTo(AdminAuditLogAction.VIEWER_ALLOWLIST_REMOVED.name)
        assertThat(latestAuditLog.targetEmail).isEqualTo("viewer@iportfolio.co.kr")
        assertThat(latestAuditLog.beforeState)
            .contains("\"allowlisted\":true")
            .contains("\"effectiveCompanyWideViewer\":true")
        assertThat(latestAuditLog.afterState)
            .contains("\"allowlisted\":false")
            .contains("\"effectiveCompanyWideViewer\":false")
    }

    @Test
    fun `lists seeded organizations for manual assignment options`() {
        val organizations = userDirectoryService.listOrganizations()

        assertThat(organizations).extracting("name")
            .contains("AI전략사업팀", "콘텐츠개발1팀", "마케팅팀")

        assertThat(
            organizations.first { organization -> organization.name == "AI전략사업팀" }.id,
        ).isEqualTo(strategyOrganization.id)
    }
}
