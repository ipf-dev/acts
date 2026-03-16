package com.acts.auth

import org.springframework.data.jpa.repository.JpaRepository

interface ViewerAllowlistRepository : JpaRepository<ViewerAllowlistEntity, String> {
    fun findAllByOrderByEmailAsc(): List<ViewerAllowlistEntity>
}
