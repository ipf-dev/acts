package com.acts.auth

import com.acts.auth.user.UserDirectoryService
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.stereotype.Service

@Service
class ActsOidcUserService(
    private val authProperties: ActsAuthProperties,
    private val userDirectoryService: UserDirectoryService,
) : OAuth2UserService<OidcUserRequest, OidcUser> {
    private val delegate = OidcUserService()

    override fun loadUser(userRequest: OidcUserRequest): OidcUser {
        val oidcUser = delegate.loadUser(userRequest)
        val email = oidcUser.email?.lowercase()
            ?: throw oauth2Exception(AuthFailureReason.EMAIL_MISSING)

        if (!email.endsWith("@${authProperties.allowedDomain.lowercase()}")) {
            throw oauth2Exception(AuthFailureReason.DOMAIN_MISMATCH)
        }

        if (oidcUser.emailVerified != true) {
            throw oauth2Exception(AuthFailureReason.EMAIL_NOT_VERIFIED)
        }

        val displayName = oidcUser.fullName ?: oidcUser.givenName ?: email.substringBefore("@")
        val profile = userDirectoryService.syncLogin(
            email = email,
            displayName = displayName,
        )

        val authorities = mutableSetOf<GrantedAuthority>(SimpleGrantedAuthority("ROLE_USER"))
        if (profile.role == UserRole.ADMIN) {
            authorities += SimpleGrantedAuthority("ROLE_ADMIN")
        }

        return DefaultOidcUser(
            authorities,
            oidcUser.idToken,
            oidcUser.userInfo,
            "email",
        )
    }

    private fun oauth2Exception(reason: AuthFailureReason): OAuth2AuthenticationException = OAuth2AuthenticationException(
        reason.toOAuth2Error(),
    )
}
