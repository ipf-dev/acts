package com.acts.health

import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@WebMvcTest(HealthController::class)
@AutoConfigureMockMvc(addFilters = false)
class HealthControllerTest @Autowired constructor(
    private val mockMvc: MockMvc,
) {
    @MockBean
    private lateinit var healthService: HealthService

    @Test
    fun `returns the backend health payload`() {
        given(healthService.getHealth()).willReturn(
            HealthResponse(
                ok = true,
                service = "acts-backend",
            ),
        )

        mockMvc.get("/api/health") {
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            content { contentTypeCompatibleWith(MediaType.APPLICATION_JSON) }
            jsonPath("$.ok") { value(true) }
            jsonPath("$.service") { value("acts-backend") }
        }
    }
}
