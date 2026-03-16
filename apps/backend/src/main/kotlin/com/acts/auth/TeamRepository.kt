package com.acts.auth

import org.springframework.data.jpa.repository.JpaRepository

interface TeamRepository : JpaRepository<TeamEntity, Long> {
    fun findAllByOrderByNameAsc(): List<TeamEntity>
}
