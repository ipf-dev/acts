package com.acts.auth

import com.acts.auth.audit.AdminAuditLogAction
import com.acts.auth.audit.AdminAuditLogRepository
import com.acts.auth.audit.AuditLogCategory
import com.acts.auth.audit.AuditLogOutcome
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import com.acts.support.TEST_ADMIN_EMAIL
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.authentication.TestingAuthenticationToken
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@Transactional
class AuthEventLoggingTest @Autowired constructor(
    private val adminAuditLogRepository: AdminAuditLogRepository,
    private val authSuccessHandler: AuthSuccessHandler,
) {
    private val logger = LoggerFactory.getLogger(AuthEventLogger::class.java) as Logger
    private val listAppender = ListAppender<ILoggingEvent>()

    @BeforeEach
    fun attachAppender() {
        listAppender.start()
        logger.addAppender(listAppender)
    }

    @AfterEach
    fun clearLogs() {
        logger.detachAppender(listAppender)
        listAppender.list.clear()
    }

    @Test
    fun `successful login is logged persisted and redirected back to the frontend`() {
        val request = MockHttpServletRequest("GET", "/login/oauth2/code/google").apply {
            remoteAddr = "127.0.0.1"
            addHeader("User-Agent", "JUnit")
        }
        val response = MockHttpServletResponse()
        val authentication = TestingAuthenticationToken(
            TEST_ADMIN_EMAIL,
            null,
            "ROLE_ADMIN",
        )

        authSuccessHandler.onAuthenticationSuccess(request, response, authentication)

        val auditLog = adminAuditLogRepository.findTop50ByOrderByCreatedAtDescIdDesc().single()

        assertThat(response.redirectedUrl).isEqualTo("http://localhost:5173/?login=success")
        assertThat(listAppender.list).hasSize(1)
        assertThat(listAppender.list.single().level).isEqualTo(Level.INFO)
        assertThat(listAppender.list.single().formattedMessage)
            .contains("event=auth_login")
            .contains("outcome=success")
            .contains("email=$TEST_ADMIN_EMAIL")
            .contains("role=ADMIN")

        assertThat(auditLog.category).isEqualTo(AuditLogCategory.AUTH)
        assertThat(auditLog.outcome).isEqualTo(AuditLogOutcome.SUCCESS)
        assertThat(auditLog.actionType).isEqualTo(AdminAuditLogAction.LOGIN_SUCCESS)
        assertThat(auditLog.actorEmail).isEqualTo(TEST_ADMIN_EMAIL)
        assertThat(auditLog.targetEmail).isEqualTo(TEST_ADMIN_EMAIL)
        assertThat(auditLog.detail).contains("Google SSO 로그인 성공")
    }

    @Test
    fun `google login falls back to frontend error redirect when oauth is not configured`() {
        val handler = AuthFailureHandler(
            authProperties = ActsAuthProperties(frontendBaseUrl = "http://localhost:5173"),
        )
        val request = MockHttpServletRequest("GET", "/login/oauth2/code/google").apply {
            remoteAddr = "127.0.0.1"
            addHeader("User-Agent", "JUnit")
        }
        val response = MockHttpServletResponse()
        val exception = AuthFailureReason.DOMAIN_MISMATCH.toOAuth2Error()

        handler.onAuthenticationFailure(
            request,
            response,
            OAuth2AuthenticationException(exception),
        )

        assertThat(response.redirectedUrl)
            .isEqualTo("http://localhost:5173/?loginError=domain_mismatch")
        assertThat(listAppender.list).isEmpty()
    }
}
