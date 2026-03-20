package com.acts.auth.org

import org.springframework.data.jpa.repository.JpaRepository

interface OrganizationRepository : JpaRepository<OrganizationEntity, Long> {
    fun findAllByOrderByNameAsc(): List<OrganizationEntity>
}
