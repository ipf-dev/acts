package com.acts.auth

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
}
