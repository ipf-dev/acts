package com.acts.auth

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
    private val departmentRepository: DepartmentRepository,
    private val teamRepository: TeamRepository,
    private val userDirectoryService: UserDirectoryService,
) {
    private lateinit var strategyDepartment: DepartmentEntity
    private lateinit var strategyTeam: TeamEntity
    private lateinit var marketingDepartment: DepartmentEntity
    private lateinit var marketingTeam: TeamEntity

    @BeforeEach
    fun loadDirectoryOptions() {
        strategyDepartment = departmentRepository.findAllByOrderByNameAsc()
            .first { department -> department.name == "전략본부" }
        marketingDepartment = departmentRepository.findAllByOrderByNameAsc()
            .first { department -> department.name == "마케팅본부" }
        strategyTeam = teamRepository.findAllByOrderByNameAsc()
            .first { team -> team.name == "AI전략사업팀" }
        marketingTeam = teamRepository.findAllByOrderByNameAsc()
            .first { team -> team.name == "마케팅팀" }
    }

    @Test
    fun `requires manual assignment until an admin sets a department and team`() {
        val profile = userDirectoryService.syncLogin(
            email = "unknown@iportfolio.co.kr",
            displayName = "Unknown",
        )

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.UNMAPPED)
        assertThat(profile.departmentName).isNull()
        assertThat(profile.teamName).isNull()
        assertThat(profile.positionTitle).isNull()
        assertThat(profile.companyWideViewer).isFalse()
        assertThat(profile.manualAssignmentRequired).isTrue()
    }

    @Test
    fun `manual assignment stores department team and position title and records an audit log`() {
        userDirectoryService.syncLogin(
            email = "coco@iportfolio.co.kr",
            displayName = "Coco",
        )

        val profile = userDirectoryService.saveManualAssignment(
            email = "coco@iportfolio.co.kr",
            departmentId = marketingDepartment.id!!,
            teamId = marketingTeam.id!!,
            positionTitle = "마케터",
            actorEmail = "minsungkim@iportfolio.co.kr",
        )

        val auditLogs = userDirectoryService.listAuditLogs()

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.MANUAL)
        assertThat(profile.departmentId).isEqualTo(marketingDepartment.id)
        assertThat(profile.departmentName).isEqualTo("마케팅본부")
        assertThat(profile.teamId).isEqualTo(marketingTeam.id)
        assertThat(profile.teamName).isEqualTo("마케팅팀")
        assertThat(profile.positionTitle).isEqualTo("마케터")
        assertThat(profile.manualAssignmentRequired).isFalse()

        assertThat(auditLogs).hasSize(1)
        assertThat(auditLogs.single().actionType).isEqualTo(AdminAuditLogAction.USER_ASSIGNMENT_UPDATED.name)
        assertThat(auditLogs.single().actorEmail).isEqualTo("minsungkim@iportfolio.co.kr")
        assertThat(auditLogs.single().targetEmail).isEqualTo("coco@iportfolio.co.kr")
        assertThat(auditLogs.single().beforeState).contains("\"departmentName\":null")
        assertThat(auditLogs.single().afterState)
            .contains("\"departmentName\":\"마케팅본부\"")
            .contains("\"teamName\":\"마케팅팀\"")
            .contains("\"positionTitle\":\"마케터\"")
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
        )
        adminAuditLogRepository.deleteAll()

        userDirectoryService.removeViewerAllowlist(
            email = "viewer@iportfolio.co.kr",
            actorEmail = "minsungkim@iportfolio.co.kr",
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
    fun `lists seeded departments and teams for manual assignment options`() {
        val departments = userDirectoryService.listDepartments()
        val teams = userDirectoryService.listTeams()

        assertThat(departments).extracting("name")
            .contains("전략본부", "콘텐츠개발본부", "마케팅본부")
        assertThat(teams).extracting("name")
            .contains("AI전략사업팀", "콘텐츠개발1팀", "마케팅팀")

        assertThat(
            teams.first { team -> team.name == "AI전략사업팀" }.departmentId,
        ).isEqualTo(strategyDepartment.id)
        assertThat(
            teams.first { team -> team.name == "마케팅팀" }.departmentId,
        ).isEqualTo(marketingDepartment.id)
    }
}
