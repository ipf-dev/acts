package com.acts.auth

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.authentication.TestingAuthenticationToken
import org.springframework.security.oauth2.core.OAuth2AuthenticationException

class AuthEventLoggingTest {
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
    fun `successful login is logged and redirected back to the frontend`() {
        val handler = AuthSuccessHandler(
            authProperties = ActsAuthProperties(frontendBaseUrl = "http://localhost:5173"),
            authEventLogger = AuthEventLogger(),
        )
        val request = MockHttpServletRequest("GET", "/login/oauth2/code/google").apply {
            remoteAddr = "127.0.0.1"
            addHeader("User-Agent", "JUnit")
        }
        val response = MockHttpServletResponse()
        val authentication = TestingAuthenticationToken(
            "minsungkim@iportfolio.co.kr",
            null,
            "ROLE_ADMIN",
        )

        handler.onAuthenticationSuccess(request, response, authentication)

        assertThat(response.redirectedUrl).isEqualTo("http://localhost:5173/?login=success")
        assertThat(listAppender.list).hasSize(1)
        assertThat(listAppender.list.single().level).isEqualTo(Level.INFO)
        assertThat(listAppender.list.single().formattedMessage)
            .contains("event=auth_login")
            .contains("outcome=success")
            .contains("email=minsungkim@iportfolio.co.kr")
            .contains("role=ADMIN")
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
