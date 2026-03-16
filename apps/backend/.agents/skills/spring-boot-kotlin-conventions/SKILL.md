---
name: spring-boot-kotlin-conventions
description: Add or refactor backend feature slices in this repo using Spring Boot and Kotlin conventions for package layout, DTO boundaries, configuration, and tests. Use when changing controllers, services, repositories, configuration properties, or backend tests inside apps/backend.
---

# Spring Boot Kotlin Conventions

## Workflow

1. Read `docs/ARCHITECTURE.md`, `apps/backend/README.md`, `build.gradle.kts`, and every file in the feature package you will touch.
2. Keep the main application class in the root `com.acts` package.
3. Put new feature code under `src/main/kotlin/com/acts/<feature>`.
4. Put tests under the matching package path in `src/test/kotlin`.
5. Keep dependencies and framework annotations minimal and explicit.

## Slice Shape

- Organize backend code by feature package first, not by global technical layer.
- Keep controllers thin: deserialize input, delegate once, and map explicit response DTOs.
- Keep service classes focused on one business capability. Split them before they become multi-purpose coordinators.
- Keep repositories, external clients, and configuration at the boundary layer.
- Use explicit request and response DTOs. Do not expose persistence entities or external payloads directly from controllers.

## Kotlin And Spring Rules

- Follow package-based directory layout and file naming from Kotlin conventions. Prefer PascalCase file names that match the main type.
- Prefer immutable `data class` DTOs and value objects unless mutation is required by the framework boundary.
- Use constructor injection with non-null dependencies. Avoid field injection.
- Prefer grouped `@ConfigurationProperties` classes over scattered `@Value` lookups when binding related settings.
- Keep nullability meaningful. Use nullable types only when absence is a real domain fact, otherwise validate and fail early.
- Put transactions and orchestration in the service layer, not in controllers.

## Testing

- Default to plain unit tests for service or domain logic that does not need a Spring context.
- Use `@WebMvcTest` for controller routing, validation, and serialization behavior.
- Use `@DataJpaTest` when a repository slice is introduced.
- Use `@SpringBootTest` only for true cross-layer integration where slice tests are insufficient.
- Keep test names descriptive and align test package paths with production package paths.

## Verification

- Run `./gradlew test` before finishing backend behavior changes.

## Reference Anchors

- Spring Boot: [Structuring Your Code](https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html)
- Spring Boot: [Externalized Configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)
- Spring Boot: [Testing](https://docs.spring.io/spring-boot/reference/testing/index.html)
- Spring Boot: [Testing Spring Applications](https://docs.spring.io/spring-boot/reference/testing/spring-applications.html)
- Kotlin: [Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)

## Default Output

- feature-oriented packages under `com.acts.<feature>`
- thin controllers with explicit DTOs
- service-layer orchestration with boundary dependencies pushed outward
- tests that match the narrowest useful Spring scope
