package com.acts.project

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity

inline fun <T> handleProjectRequest(
    status: HttpStatus = HttpStatus.OK,
    block: () -> T,
): ResponseEntity<T> = try {
    ResponseEntity.status(status).body(block())
} catch (_: NoSuchElementException) {
    ResponseEntity.status(HttpStatus.NOT_FOUND).build()
} catch (_: SecurityException) {
    ResponseEntity.status(HttpStatus.FORBIDDEN).build()
} catch (_: IllegalArgumentException) {
    ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
}

inline fun handleProjectVoidRequest(block: () -> Unit): ResponseEntity<Void> = try {
    block()
    ResponseEntity.noContent().build()
} catch (_: NoSuchElementException) {
    ResponseEntity.status(HttpStatus.NOT_FOUND).build()
} catch (_: SecurityException) {
    ResponseEntity.status(HttpStatus.FORBIDDEN).build()
} catch (_: IllegalArgumentException) {
    ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
}
