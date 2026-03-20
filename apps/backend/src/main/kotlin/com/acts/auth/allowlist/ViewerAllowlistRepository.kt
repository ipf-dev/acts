package com.acts.auth.allowlist

import org.springframework.data.jpa.repository.JpaRepository

interface ViewerAllowlistRepository : JpaRepository<ViewerAllowlistEntity, String> {
    fun findAllByOrderByEmailAsc(): List<ViewerAllowlistEntity>
}
