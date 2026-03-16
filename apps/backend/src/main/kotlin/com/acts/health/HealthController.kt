package com.acts.health

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/health")
class HealthController(
    private val healthService: HealthService,
) {
    @GetMapping
    fun getHealth(): HealthResponse = healthService.getHealth()
}
