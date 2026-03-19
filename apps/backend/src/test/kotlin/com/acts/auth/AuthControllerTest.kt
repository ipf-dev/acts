package com.acts.auth

import org.hamcrest.Matchers.hasItem
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest @Autowired constructor(
    private val mockMvc: MockMvc,
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
}
