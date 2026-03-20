package com.acts.auth.user

import org.springframework.data.jpa.repository.JpaRepository

interface UserAccountRepository : JpaRepository<UserAccountEntity, String> {
    fun findAllByOrderByDisplayNameAscEmailAsc(): List<UserAccountEntity>
}
