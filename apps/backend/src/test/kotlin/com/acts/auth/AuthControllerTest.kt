package com.acts.auth

import com.acts.auth.user.UserDirectoryService
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
    private val userDirectoryService: UserDirectoryService,
) {
    @Test
    @WithMockUser(username = "minsungkim@iportfolio.co.kr", roles = ["ADMIN"])
    fun `viewer allowlist can be added with query parameter`() {
        mockMvc.post("/api/auth/admin/viewer-allowlist") {
            param("email", "leader@iportfolio.co.kr")
        }
            .andExpect {
                status { isOk() }
                jsonPath("$[*].email", hasItem("leader@iportfolio.co.kr"))
            }
    }

    @Test
    @WithMockUser(username = "minsungkim@iportfolio.co.kr", roles = ["ADMIN"])
    fun `user feature access can be updated`() {
        userDirectoryService.syncLogin(
            email = "coco@iportfolio.co.kr",
            displayName = "Coco",
        )

        mockMvc.put("/api/auth/admin/users/coco@iportfolio.co.kr/feature-access") {
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"allowedFeatureKeys":["ASSET_LIBRARY"]}"""
        }
            .andExpect {
                status { isOk() }
                jsonPath("$.email") { value("coco@iportfolio.co.kr") }
                jsonPath("$.allowedFeatures", hasSize<Any>(1))
                jsonPath("$.deniedFeatures", hasSize<Any>(0))
            }
    }

    @Test
    @WithMockUser(username = "minsungkim@iportfolio.co.kr", roles = ["ADMIN"])
    fun `manual assignment request body can be deserialized`() {
        userDirectoryService.syncLogin(
            email = "coco@iportfolio.co.kr",
            displayName = "Coco",
        )

        mockMvc.put("/api/auth/admin/users/coco@iportfolio.co.kr/assignment") {
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"organizationId":1}"""
        }
            .andExpect {
                status { isOk() }
                jsonPath("$.email") { value("coco@iportfolio.co.kr") }
                jsonPath("$.organizationId") { value(1) }
            }
    }

    @Test
    @WithMockUser(username = "minsungkim@iportfolio.co.kr", roles = ["ADMIN"])
    fun `admin user can promote another user to admin`() {
        userDirectoryService.syncLogin(
            email = "coco@iportfolio.co.kr",
            displayName = "Coco",
        )

        mockMvc.post("/api/auth/admin/users/coco@iportfolio.co.kr/promote")
            .andExpect {
                status { isOk() }
                jsonPath("$.email") { value("coco@iportfolio.co.kr") }
                jsonPath("$.role") { value("ADMIN") }
                jsonPath("$.companyWideViewer") { value(true) }
            }
    }

    @Test
    @WithMockUser(username = "coco@iportfolio.co.kr", roles = ["USER"])
    fun `non admin user cannot promote another user to admin`() {
        userDirectoryService.syncLogin(
            email = "leader@iportfolio.co.kr",
            displayName = "Leader",
        )

        mockMvc.post("/api/auth/admin/users/leader@iportfolio.co.kr/promote")
            .andExpect {
                status { isForbidden() }
            }
    }
}
