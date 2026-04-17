package com.acts.auth.user

class UserAccountDeactivatedException(val email: String) : RuntimeException(
    "User account $email has been deactivated.",
)
