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
    private val departmentRepository: DepartmentRepository,
    private val userDirectoryService: UserDirectoryService,
) {
    private lateinit var marketingDepartment: DepartmentEntity

    @BeforeEach
    fun loadDepartments() {
        marketingDepartment = departmentRepository.findAllByOrderByNameAsc()
            .first { department -> department.name == "마케팅팀" }
    }

    @Test
    fun `requires manual assignment until an admin sets a department`() {
        val profile = userDirectoryService.syncLogin(
            email = "unknown@iportfolio.co.kr",
            displayName = "Unknown",
        )

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.UNMAPPED)
        assertThat(profile.departmentName).isNull()
        assertThat(profile.positionTitle).isNull()
        assertThat(profile.manualAssignmentRequired).isTrue()
    }

    @Test
    fun `manual assignment stores department and position title for the user`() {
        userDirectoryService.syncLogin(
            email = "design.coco@iportfolio.co.kr",
            displayName = "Coco",
        )

        val profile = userDirectoryService.saveManualAssignment(
            email = "design.coco@iportfolio.co.kr",
            departmentId = requireNotNull(marketingDepartment.id),
            positionTitle = "마케터",
        )

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.MANUAL)
        assertThat(profile.departmentId).isEqualTo(marketingDepartment.id)
        assertThat(profile.departmentName).isEqualTo("마케팅팀")
        assertThat(profile.positionTitle).isEqualTo("마케터")
    }

    @Test
    fun `lists seeded departments for manual assignment options`() {
        val departments = userDirectoryService.listDepartments()

        assertThat(departments).extracting("name")
            .contains("AI전략사업팀", "콘텐츠개발1팀", "마케팅팀")
    }
}
