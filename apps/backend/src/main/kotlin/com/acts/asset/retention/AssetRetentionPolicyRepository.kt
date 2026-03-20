package com.acts.asset.retention

import org.springframework.data.jpa.repository.JpaRepository

interface AssetRetentionPolicyRepository : JpaRepository<AssetRetentionPolicyEntity, Long> {
    fun findFirstByOrderByUpdatedAtDescIdDesc(): AssetRetentionPolicyEntity?
}
