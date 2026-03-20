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

## Package Layout

### Feature-First Organization

Organize backend code by feature package first, not by global technical layer.

```
com.acts/
├── ActsApplication.kt
├── asset/
│   ├── AssetController.kt
│   ├── AssetLibraryService.kt
│   ├── AssetLifecycleService.kt
│   ├── AssetAuthorizationService.kt
│   ├── AssetEntity.kt
│   ├── AssetRepository.kt
│   ├── AssetFileEntity.kt
│   ├── AssetFileRepository.kt
│   ├── AssetMetadataExtractor.kt
│   ├── AssetTypeClassifier.kt
│   ├── AssetStatus.kt
│   ├── AssetType.kt
│   ├── AssetSourceType.kt
│   ├── AssetListQuery.kt
│   ├── AssetUploadCommand.kt
│   ├── AssetUpdateRequest.kt
│   ├── AssetDetailResponse.kt
│   ├── AssetSummaryResponse.kt
│   ├── AssetDownloadResult.kt
│   ├── event/
│   │   ├── AssetEventEntity.kt
│   │   ├── AssetEventRepository.kt
│   │   ├── AssetEventType.kt
│   │   └── AssetAccessScopeAuditSnapshot.kt
│   ├── preview/
│   │   ├── AssetPreviewGenerator.kt          (interface)
│   │   ├── FfmpegAssetPreviewGenerator.kt
│   │   ├── AssetPreviewProperties.kt
│   │   └── AssetPreviewResult.kt
│   ├── retention/
│   │   ├── AssetRetentionPolicyEntity.kt
│   │   ├── AssetRetentionPolicyRepository.kt
│   │   ├── AssetRetentionPolicyResponse.kt
│   │   └── AssetRetentionPolicyUpdateRequest.kt
│   ├── storage/
│   │   ├── AssetBinaryStorage.kt             (interface)
│   │   ├── S3AssetBinaryStorage.kt
│   │   ├── AssetStorageConfiguration.kt
│   │   └── AssetStorageProperties.kt
│   └── tag/
│       ├── AssetTagEntity.kt
│       ├── AssetTagRepository.kt
│       ├── AssetTagSuggestionService.kt
│       └── AssetTagSource.kt
├── auth/
│   ├── AuthController.kt
│   ├── SecurityConfig.kt
│   ├── ActsAuthProperties.kt
│   ├── ActsOidcUserService.kt
│   ├── AuthEventLogger.kt
│   ├── AuthFailureHandler.kt
│   ├── AuthFailureReason.kt
│   ├── AuthSessionResponse.kt
│   ├── AuthSuccessHandler.kt
│   ├── AuthUserProfile.kt
│   ├── GoogleLoginAvailability.kt
│   ├── UserRole.kt
│   ├── allowlist/
│   │   ├── ViewerAllowlistEntity.kt
│   │   ├── ViewerAllowlistRepository.kt
│   │   └── ViewerAllowlistEntryResponse.kt
│   ├── audit/
│   │   ├── AdminAuditLogEntity.kt
│   │   ├── AdminAuditLogRepository.kt
│   │   ├── AdminAuditLogService.kt
│   │   ├── AdminAuditLogAction.kt
│   │   ├── AuditLogCategory.kt
│   │   ├── AuditLogOutcome.kt
│   │   └── AuditLogResponse.kt
│   ├── feature/
│   │   ├── AppFeatureKey.kt
│   │   ├── UserFeatureAccessEntity.kt
│   │   ├── UserFeatureAccessRepository.kt
│   │   ├── UserFeatureAccessService.kt
│   │   └── UserFeatureAuthorizationResponse.kt
│   ├── org/
│   │   ├── OrganizationEntity.kt
│   │   ├── OrganizationRepository.kt
│   │   └── OrganizationOptionResponse.kt
│   └── user/
│       ├── UserAccountEntity.kt
│       ├── UserAccountRepository.kt
│       ├── UserDirectoryService.kt
│       ├── ManualAssignmentRequest.kt
│       └── UserMappingMode.kt
└── health/
    ├── HealthController.kt
    ├── HealthService.kt
    └── HealthResponse.kt
```

### Sub-Package Rules

**When to stay flat (feature root):**
- Controllers, primary services, and core domain entities/repositories
- Value types (enums, sealed classes) used across multiple sub-packages
- Request/response DTOs belonging to the primary controller
- Classifiers, extractors, and utilities tightly coupled to the core entity

**When to introduce a sub-package:**
- A group of 4+ cohesive files forms a distinct concern (e.g., storage adapter + interface + config + properties)
- The group could theoretically be replaced as a unit (e.g., swap S3 for GCS without touching core logic)
- The group represents a secondary bounded context within the feature (e.g., retention policy, preview generation, audit logging)

**Sub-package naming:** Use singular domain nouns that describe the concern, not technical role nouns.
- Prefer: `storage`, `preview`, `tag`, `event`, `retention`, `audit`, `allowlist`, `feature`, `org`, `user`
- Avoid: `impl`, `dto`, `util`, `helpers`, `common`

**Maximum flat file count:** If a feature package root exceeds ~20 files, introduce sub-packages for the most cohesive clusters first.

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
- sub-packages introduced when a feature cluster reaches 4+ cohesive files with a distinct replaceable concern
- thin controllers with explicit DTOs
- service-layer orchestration with boundary dependencies pushed outward
- tests that match the narrowest useful Spring scope
