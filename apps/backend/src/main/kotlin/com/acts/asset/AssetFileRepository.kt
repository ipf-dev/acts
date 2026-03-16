package com.acts.asset

import org.springframework.data.jpa.repository.JpaRepository

interface AssetFileRepository : JpaRepository<AssetFileEntity, Long>
