package com.acts.auth

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
            email = "coco@iportfolio.co.kr",
            displayName = "Coco",
        )

        val authorization = userFeatureAccessService.listUserFeatureAuthorizations()
            .first { user -> user.email == "coco@iportfolio.co.kr" }

        assertThat(authorization.allowedFeatures).extracting("key")
            .containsExactly(AppFeatureKey.ASSET_LIBRARY)
        assertThat(authorization.deniedFeatures).isEmpty()
        assertThat(authorization.featureAccessLocked).isFalse()
    }

    @Test
    fun `admin users are locked to all features`() {
        userDirectoryService.syncLogin(
            email = "minsungkim@iportfolio.co.kr",
            displayName = "Min Sung Kim",
        )
        val account = requireNotNull(userAccountRepository.findById("minsungkim@iportfolio.co.kr").orElse(null))
        account.role = UserRole.ADMIN
        userAccountRepository.save(account)

        val authorization = userFeatureAccessService.listUserFeatureAuthorizations()
            .first { user -> user.email == "minsungkim@iportfolio.co.kr" }

        assertThat(authorization.featureAccessLocked).isTrue()
        assertThat(authorization.allowedFeatures).extracting("key")
            .containsExactly(AppFeatureKey.ASSET_LIBRARY)
        assertThat(authorization.deniedFeatures).isEmpty()
    }

    @Test
    fun `saving feature access stores overrides and resolves effective features`() {
        userDirectoryService.syncLogin(
            email = "sohee.han@iportfolio.co.kr",
            displayName = "한소희",
        )

        val savedAuthorization = userFeatureAccessService.saveUserFeatureAccess(
            email = "sohee.han@iportfolio.co.kr",
            allowedFeatureKeys = listOf(AppFeatureKey.ASSET_LIBRARY),
            actorEmail = "minsungkim@iportfolio.co.kr",
            actorName = "Min Sung Kim",
        )
        val effectiveFeatures = userFeatureAccessService.resolveAllowedFeatureKeys(
            email = "sohee.han@iportfolio.co.kr",
            role = UserRole.USER,
        )

        assertThat(savedAuthorization.allowedFeatures).extracting("key")
            .containsExactly(AppFeatureKey.ASSET_LIBRARY)
        assertThat(savedAuthorization.deniedFeatures).isEmpty()
        assertThat(effectiveFeatures)
            .containsExactly(AppFeatureKey.ASSET_LIBRARY)
    }
}
