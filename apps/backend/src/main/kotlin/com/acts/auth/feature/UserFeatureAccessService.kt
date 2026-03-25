package com.acts.auth.feature

import com.acts.auth.UserRole
import com.acts.auth.audit.AdminAuditLogService
import com.acts.auth.audit.UserFeatureAccessAuditSnapshot
import com.acts.auth.user.UserAccountEntity
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service

@Service
class UserFeatureAccessService(
    private val adminAuditLogService: AdminAuditLogService,
    private val userAccountRepository: UserAccountRepository,
    private val userFeatureAccessRepository: UserFeatureAccessRepository,
) {
    @Transactional
    fun resolveAllowedFeatureKeys(
        email: String,
        role: UserRole,
    ): List<AppFeatureKey> = buildFeatureAccess(
        role = role,
        overridesByFeature = loadOverridesByFeature(email),
    ).filterValues { isAllowed -> isAllowed }
        .keys
        .toList()

    @Transactional
    fun isFeatureAllowed(
        email: String,
        role: UserRole,
        featureKey: AppFeatureKey,
    ): Boolean = buildFeatureAccess(
        role = role,
        overridesByFeature = loadOverridesByFeature(email),
    ).getValue(featureKey)

    @Transactional
    fun listUserFeatureAuthorizations(): List<UserFeatureAuthorizationResponse> {
        val accounts = userAccountRepository.findAllByOrderByDisplayNameAscEmailAsc()
        if (accounts.isEmpty()) {
            return emptyList()
        }

        val overridesByEmail = userFeatureAccessRepository.findAllByUserEmailIn(accounts.map { account -> account.email })
            .groupBy { entity -> entity.userEmail }
            .mapValues { (_, entries) -> entries.associateBy { entity -> entity.featureKey } }

        return accounts.map { account ->
            buildResponse(
                account = account,
                overridesByFeature = overridesByEmail[account.email].orEmpty(),
            )
        }
    }

    @Transactional
    fun saveUserFeatureAccess(
        email: String,
        allowedFeatureKeys: List<AppFeatureKey>,
        actorEmail: String,
        actorName: String?,
    ): UserFeatureAuthorizationResponse {
        val normalizedEmail = email.lowercase()
        val account = userAccountRepository.findById(normalizedEmail)
            .orElseThrow { IllegalArgumentException("기능 권한을 저장할 사용자를 찾을 수 없습니다.") }
        val existingOverrides = loadOverridesByFeature(normalizedEmail)
        val beforeState = buildAuditSnapshot(account, existingOverrides)

        if (account.role == UserRole.ADMIN) {
            userFeatureAccessRepository.deleteAllByUserEmail(normalizedEmail)
            return buildResponse(account, emptyMap())
        }

        val nextAllowedKeys = allowedFeatureKeys.toSet()
        val nextOverrides = AppFeatureKey.entries.mapNotNull { featureKey ->
            val desiredAllowed = featureKey in nextAllowedKeys
            if (desiredAllowed == featureKey.defaultAllowed) {
                null
            } else {
                UserFeatureAccessEntity(
                    userEmail = normalizedEmail,
                    featureKey = featureKey,
                    allowed = desiredAllowed,
                )
            }
        }

        userFeatureAccessRepository.deleteAllByUserEmail(normalizedEmail)
        userFeatureAccessRepository.saveAll(nextOverrides)

        val afterState = buildAuditSnapshot(account, loadOverridesByFeature(normalizedEmail))
        adminAuditLogService.recordUserFeatureAccessUpdated(
            actorEmail = actorEmail,
            actorName = actorName,
            targetEmail = account.email,
            targetName = account.displayName,
            beforeState = beforeState,
            afterState = afterState,
        )

        return buildResponse(account, loadOverridesByFeature(normalizedEmail))
    }

    private fun buildResponse(
        account: UserAccountEntity,
        overridesByFeature: Map<AppFeatureKey, UserFeatureAccessEntity>,
    ): UserFeatureAuthorizationResponse {
        val featureAccess = buildFeatureAccess(
            role = account.role,
            overridesByFeature = overridesByFeature,
        )
        val featureResponses = AppFeatureKey.entries.map { featureKey -> featureKey.toResponse() }

        return UserFeatureAuthorizationResponse(
            email = account.email,
            displayName = account.displayName,
            organizationName = account.organization?.name,
            role = account.role,
            featureAccessLocked = account.role == UserRole.ADMIN,
            allowedFeatures = featureResponses.filter { feature -> featureAccess.getValue(feature.key) },
            deniedFeatures = featureResponses.filterNot { feature -> featureAccess.getValue(feature.key) },
        )
    }

    private fun buildFeatureAccess(
        role: UserRole,
        overridesByFeature: Map<AppFeatureKey, UserFeatureAccessEntity>,
    ): LinkedHashMap<AppFeatureKey, Boolean> = LinkedHashMap<AppFeatureKey, Boolean>().apply {
        AppFeatureKey.entries.forEach { featureKey ->
            put(
                featureKey,
                if (role == UserRole.ADMIN) {
                    true
                } else {
                    overridesByFeature[featureKey]?.allowed ?: featureKey.defaultAllowed
                },
            )
        }
    }

    private fun buildAuditSnapshot(
        account: UserAccountEntity,
        overridesByFeature: Map<AppFeatureKey, UserFeatureAccessEntity>,
    ): UserFeatureAccessAuditSnapshot {
        val featureAccess = buildFeatureAccess(account.role, overridesByFeature)
        return UserFeatureAccessAuditSnapshot(
            email = account.email,
            role = account.role.name,
            allowedFeatureKeys = featureAccess.filterValues { it }.keys.map { featureKey -> featureKey.name },
            deniedFeatureKeys = featureAccess.filterValues { !it }.keys.map { featureKey -> featureKey.name },
        )
    }

    private fun loadOverridesByFeature(email: String): Map<AppFeatureKey, UserFeatureAccessEntity> =
        userFeatureAccessRepository.findAllByUserEmailOrderByFeatureKeyAsc(email.lowercase())
            .associateBy { entity -> entity.featureKey }
}
