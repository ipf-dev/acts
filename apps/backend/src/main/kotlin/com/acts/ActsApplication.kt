package com.acts

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ActsApplication

fun main(args: Array<String>) {
    runApplication<ActsApplication>(*args)
}

