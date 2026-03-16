package com.acts.health

import org.springframework.stereotype.Service

@Service
class HealthService {
    fun getHealth(): HealthResponse = HealthResponse(
        ok = true,
        service = "acts-backend",
    )
}
