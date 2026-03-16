package com.acts.auth

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class UserDirectoryServiceTest {
    @Test
    fun `requires manual assignment until an admin sets team and department`() {
        val service = createService()

        val profile = service.syncLogin(
            email = "unknown@iportfolio.co.kr",
            displayName = "Unknown",
        )

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.UNMAPPED)
        assertThat(profile.manualAssignmentRequired).isTrue()
    }

    @Test
    fun `manual assignment stores team and department for the user`() {
        val service = createService()

        service.syncLogin(
            email = "design.coco@iportfolio.co.kr",
            displayName = "Coco",
        )

        val profile = service.saveManualAssignment(
            email = "design.coco@iportfolio.co.kr",
            teamName = "Marketing Team",
            departmentName = "Marketing",
        )

        assertThat(profile.mappingMode).isEqualTo(UserMappingMode.MANUAL)
        assertThat(profile.teamName).isEqualTo("Marketing Team")
        assertThat(profile.departmentName).isEqualTo("Marketing")
    }

    private fun createService(): UserDirectoryService = UserDirectoryService(
        authProperties = ActsAuthProperties(),
    )
}
