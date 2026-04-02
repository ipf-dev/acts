package com.acts.auth.domain

import com.acts.auth.api.GoogleLoginAvailability
import com.acts.auth.service.ActsOidcUserService
import com.acts.auth.service.AuthFailureHandler
import com.acts.auth.service.AuthSuccessHandler
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(ActsAuthProperties::class)
class SecurityConfig(
    private val actsOidcUserService: ActsOidcUserService,
    private val authSuccessHandler: AuthSuccessHandler,
    private val authFailureHandler: AuthFailureHandler,
    private val googleLoginAvailability: GoogleLoginAvailability,
) {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            csrf { disable() }
            authorizeHttpRequests {
                authorize("/api/health", permitAll)
                authorize("/api/auth/me", permitAll)
                authorize("/api/auth/login/google", permitAll)
                authorize("/api/auth/admin/**", hasRole("ADMIN"))
                authorize("/api/assets/**", authenticated)
                authorize("/api/auth/logout", authenticated)
                authorize(anyRequest, permitAll)
            }
        }

        if (googleLoginAvailability.isConfigured()) {
            http {
                oauth2Login {
                    userInfoEndpoint {
                        oidcUserService = actsOidcUserService
                    }
                    authenticationSuccessHandler = authSuccessHandler
                    authenticationFailureHandler = authFailureHandler
                }
            }
        }

        return http.build()
    }
}
