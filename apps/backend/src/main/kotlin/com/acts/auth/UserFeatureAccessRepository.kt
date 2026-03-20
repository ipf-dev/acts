package com.acts.auth

import org.springframework.data.jpa.repository.JpaRepository

interface UserFeatureAccessRepository : JpaRepository<UserFeatureAccessEntity, Long> {
    fun deleteAllByUserEmail(userEmail: String)

    fun findAllByUserEmailIn(userEmails: Collection<String>): List<UserFeatureAccessEntity>

    fun findAllByUserEmailOrderByFeatureKeyAsc(userEmail: String): List<UserFeatureAccessEntity>
}
