package com.acts.auth

import com.acts.auth.feature.AppFeatureKey
import com.acts.auth.feature.UserFeatureAccessService
import com.acts.auth.user.UserAccountRepository
import com.acts.auth.user.UserDirectoryService
import com.acts.support.TEST_ADMIN_EMAIL
import com.acts.support.TEST_ADMIN_NAME
import com.acts.support.TEST_CREATOR_EMAIL
import com.acts.support.TEST_CREATOR_NAME
import com.acts.support.TEST_RESTRICTED_EMAIL
import com.acts.support.TEST_RESTRICTED_NAME
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@Transactional
class UserFeatureAccessServiceTest @Autowired constructor(
    private val userAccountRepository: UserAccountRepository,
    private val userDirectoryService: UserDirectoryService,
    private val userFeatureAccessService: UserFeatureAccessService,
) {
    @Test
    fun `non admin users get default allow deny split`() {
        userDirectoryService.syncLogin(
            email = TEST_CREATOR_EMAIL,
            displayName = TEST_CREATOR_NAME,
        )

        val authorization = userFeatureAccessService.listUserFeatureAuthorizations()
            .first { user -> user.email == TEST_CREATOR_EMAIL }

        assertThat(authorization.allowedFeatures).extracting("key")
            .containsExactly(AppFeatureKey.ASSET_LIBRARY)
        assertThat(authorization.deniedFeatures).isEmpty()
        assertThat(authorization.featureAccessLocked).isFalse()
    }

    @Test
    fun `admin users are locked to all features`() {
        userDirectoryService.syncLogin(
            email = TEST_ADMIN_EMAIL,
            displayName = TEST_ADMIN_NAME,
        )
        val account = requireNotNull(userAccountRepository.findById(TEST_ADMIN_EMAIL).orElse(null))
        account.role = UserRole.ADMIN
        userAccountRepository.save(account)

        val authorization = userFeatureAccessService.listUserFeatureAuthorizations()
            .first { user -> user.email == TEST_ADMIN_EMAIL }

        assertThat(authorization.featureAccessLocked).isTrue()
        assertThat(authorization.allowedFeatures).extracting("key")
            .containsExactly(AppFeatureKey.ASSET_LIBRARY)
        assertThat(authorization.deniedFeatures).isEmpty()
    }

    @Test
    fun `saving feature access stores overrides and resolves effective features`() {
        userDirectoryService.syncLogin(
            email = TEST_RESTRICTED_EMAIL,
            displayName = TEST_RESTRICTED_NAME,
        )

        val savedAuthorization = userFeatureAccessService.saveUserFeatureAccess(
            email = TEST_RESTRICTED_EMAIL,
            allowedFeatureKeys = listOf(AppFeatureKey.ASSET_LIBRARY),
            actorEmail = TEST_ADMIN_EMAIL,
            actorName = TEST_ADMIN_NAME,
        )
        val effectiveFeatures = userFeatureAccessService.resolveAllowedFeatureKeys(
            email = TEST_RESTRICTED_EMAIL,
            role = UserRole.USER,
        )

        assertThat(savedAuthorization.allowedFeatures).extracting("key")
            .containsExactly(AppFeatureKey.ASSET_LIBRARY)
        assertThat(savedAuthorization.deniedFeatures).isEmpty()
        assertThat(effectiveFeatures)
            .containsExactly(AppFeatureKey.ASSET_LIBRARY)
    }
}
