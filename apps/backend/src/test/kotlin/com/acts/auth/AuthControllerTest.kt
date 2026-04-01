package com.acts.auth

import com.acts.auth.org.OrganizationRepository
import com.acts.auth.user.UserDirectoryService
import com.acts.support.TEST_ADMIN_EMAIL
import com.acts.support.TEST_CREATOR_EMAIL
import com.acts.support.TEST_CREATOR_NAME
import com.acts.support.TEST_MARKETING_ORG_NAME
import com.acts.support.TEST_VIEWER_EMAIL
import com.acts.support.TEST_VIEWER_NAME
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest @Autowired constructor(
    private val mockMvc: MockMvc,
    private val organizationRepository: OrganizationRepository,
    private val userDirectoryService: UserDirectoryService,
) {
    @Test
    @WithMockUser(username = TEST_ADMIN_EMAIL, roles = ["ADMIN"])
    fun `viewer allowlist can be added with query parameter`() {
        mockMvc.post("/api/auth/admin/viewer-allowlist") {
            param("email", TEST_VIEWER_EMAIL)
        }
            .andExpect {
                status { isOk() }
                jsonPath("$[*].email", hasItem(TEST_VIEWER_EMAIL))
            }
    }

    @Test
    @WithMockUser(username = TEST_ADMIN_EMAIL, roles = ["ADMIN"])
    fun `user feature access can be updated`() {
        userDirectoryService.syncLogin(
            email = TEST_CREATOR_EMAIL,
            displayName = TEST_CREATOR_NAME,
        )

        mockMvc.put("/api/auth/admin/users/$TEST_CREATOR_EMAIL/feature-access") {
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"allowedFeatureKeys":["ASSET_LIBRARY"]}"""
        }
            .andExpect {
                status { isOk() }
                jsonPath("$.email") { value(TEST_CREATOR_EMAIL) }
                jsonPath("$.allowedFeatures", hasSize<Any>(1))
                jsonPath("$.deniedFeatures", hasSize<Any>(0))
            }
    }

    @Test
    @WithMockUser(username = TEST_ADMIN_EMAIL, roles = ["ADMIN"])
    fun `manual assignment request body can be deserialized`() {
        val marketingOrganizationId = requireNotNull(
            organizationRepository.findAllByOrderByNameAsc()
                .first { organization -> organization.name == TEST_MARKETING_ORG_NAME }
                .id,
        )
        userDirectoryService.syncLogin(
            email = TEST_CREATOR_EMAIL,
            displayName = TEST_CREATOR_NAME,
        )

        mockMvc.put("/api/auth/admin/users/$TEST_CREATOR_EMAIL/assignment") {
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"organizationId":$marketingOrganizationId}"""
        }
            .andExpect {
                status { isOk() }
                jsonPath("$.email") { value(TEST_CREATOR_EMAIL) }
                jsonPath("$.organizationId") { value(marketingOrganizationId) }
            }
    }

    @Test
    @WithMockUser(username = TEST_ADMIN_EMAIL, roles = ["ADMIN"])
    fun `admin user can promote another user to admin`() {
        userDirectoryService.syncLogin(
            email = TEST_CREATOR_EMAIL,
            displayName = TEST_CREATOR_NAME,
        )

        mockMvc.post("/api/auth/admin/users/$TEST_CREATOR_EMAIL/promote")
            .andExpect {
                status { isOk() }
                jsonPath("$.email") { value(TEST_CREATOR_EMAIL) }
                jsonPath("$.role") { value("ADMIN") }
                jsonPath("$.companyWideViewer") { value(true) }
            }
    }

    @Test
    @WithMockUser(username = TEST_CREATOR_EMAIL, roles = ["USER"])
    fun `non admin user cannot promote another user to admin`() {
        userDirectoryService.syncLogin(
            email = TEST_VIEWER_EMAIL,
            displayName = TEST_VIEWER_NAME,
        )

        mockMvc.post("/api/auth/admin/users/$TEST_VIEWER_EMAIL/promote")
            .andExpect {
                status { isForbidden() }
            }
    }
}
