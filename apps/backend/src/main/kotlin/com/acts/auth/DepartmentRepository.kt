package com.acts.auth

import org.springframework.data.jpa.repository.JpaRepository

interface DepartmentRepository : JpaRepository<DepartmentEntity, Long> {
    fun findAllByOrderByNameAsc(): List<DepartmentEntity>
}
