package com.acts.asset

import com.acts.asset.event.AssetEventType
import com.acts.asset.retention.AssetRetentionPolicyUpdateRequest
import com.acts.asset.storage.AssetBinaryStorage
import com.acts.asset.storage.LoadedAssetObject
import com.acts.asset.storage.StoredAssetObject
import com.acts.auth.audit.AdminAuditLogAction
import com.acts.auth.audit.AdminAuditLogRepository
import com.acts.auth.org.OrganizationRepository
import com.acts.auth.user.UserDirectoryService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.transaction.annotation.Transactional
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.presigner.S3Presigner

@SpringBootTest
@Transactional
class AssetLifecycleServiceTest @Autowired constructor(
    private val adminAuditLogRepository: AdminAuditLogRepository,
    private val assetLibraryService: AssetLibraryService,
    private val assetLifecycleService: AssetLifecycleService,
    private val organizationRepository: OrganizationRepository,
    private val userDirectoryService: UserDirectoryService,
) {
    @MockBean
    private lateinit var assetBinaryStorage: AssetBinaryStorage

    @MockBean
    private lateinit var s3Client: S3Client

    @MockBean
    private lateinit var s3Presigner: S3Presigner

    @BeforeEach
    fun prepareUsers() {
        val organizationId = requireNotNull(
            organizationRepository.findAllByOrderByNameAsc()
                .first { organization -> organization.name == "마케팅팀" }
                .id,
        )

        userDirectoryService.syncLogin(
            email = "coco@iportfolio.co.kr",
            displayName = "Coco",
        )
        userDirectoryService.saveManualAssignment(
            email = "coco@iportfolio.co.kr",
            organizationId = organizationId,
            actorEmail = "admin@iportfolio.co.kr",
            actorName = "Admin",
        )

        userDirectoryService.syncLogin(
            email = "admin@iportfolio.co.kr",
            displayName = "Admin",
        )
        userDirectoryService.saveManualAssignment(
            email = "admin@iportfolio.co.kr",
            organizationId = organizationId,
            actorEmail = "admin@iportfolio.co.kr",
            actorName = "Admin",
        )

        whenever(assetBinaryStorage.presignUploadUrl(any(), any(), any())).thenReturn(
            "https://s3.example.com/presigned-url",
        )
        whenever(assetBinaryStorage.store(any(), any(), any())).thenReturn(
            StoredAssetObject(
                bucket = "acts-assets",
                objectKey = "assets/test/coco.txt",
            ),
        )
        whenever(assetBinaryStorage.load(any(), any())).thenReturn(
            LoadedAssetObject(
                content = "story".toByteArray(),
                contentType = "text/plain",
            ),
        )
    }

    @Test
    fun `updates retention policy and records audit log`() {
        val updatedPolicy = assetLifecycleService.updateRetentionPolicy(
            request = AssetRetentionPolicyUpdateRequest(
                trashRetentionDays = 14,
                restoreEnabled = true,
            ),
            actorEmail = "admin@iportfolio.co.kr",
            actorName = "Admin",
        )

        val auditLog = adminAuditLogRepository.findTop50ByOrderByCreatedAtDescIdDesc()
            .first { log -> log.actionType == AdminAuditLogAction.ASSET_RETENTION_POLICY_UPDATED }

        assertThat(updatedPolicy.trashRetentionDays).isEqualTo(14)
        assertThat(updatedPolicy.updatedByEmail).isEqualTo("admin@iportfolio.co.kr")
        assertThat(auditLog.detail).contains("휴지통 보관 정책")
        assertThat(auditLog.beforeState).contains("trashRetentionDays")
        assertThat(auditLog.afterState).contains("14")
    }

    @Test
    fun `restores a deleted asset within the retention window`() {
        val uploadedAsset = uploadAsset("복구 테스트 애셋")

        assetLibraryService.deleteAsset(
            assetId = uploadedAsset.id,
            actorEmail = "coco@iportfolio.co.kr",
            actorName = "Coco",
        )

        assetLifecycleService.restoreAsset(
            assetId = uploadedAsset.id,
            actorEmail = "coco@iportfolio.co.kr",
            actorName = "Coco",
        )

        val restoredAsset = assetLibraryService.getAsset(
            assetId = uploadedAsset.id,
            actorEmail = "coco@iportfolio.co.kr",
        )
        val auditLog = adminAuditLogRepository.findTop50ByOrderByCreatedAtDescIdDesc()
            .first { log -> log.actionType == AdminAuditLogAction.ASSET_RESTORED }

        assertThat(assetLibraryService.listAssets(actorEmail = "coco@iportfolio.co.kr"))
            .anyMatch { asset -> asset.id == uploadedAsset.id }
        assertThat(restoredAsset.events.first().eventType).isEqualTo(AssetEventType.RESTORED)
        assertThat(auditLog.detail).contains("복구")
    }

    private fun uploadAsset(title: String): AssetSummaryResponse {
        val intentResponse = assetLibraryService.initiateUpload(
            request = AssetUploadIntentRequest(
                fileName = "$title.txt",
                contentType = "text/plain",
                fileSizeBytes = 5L,
                title = title,
                description = "설명",
                tags = AssetStructuredTagsRequest(
                    keywords = listOf("태그"),
                ),
            ),
            actorEmail = "coco@iportfolio.co.kr",
            actorName = "Coco",
        )
        return assetLibraryService.completeUpload(
            assetId = intentResponse.assetId,
            request = AssetUploadCompleteRequest(
                objectKey = intentResponse.objectKey,
                fileSizeBytes = 5L,
            ),
            actorEmail = "coco@iportfolio.co.kr",
        )
    }
}
