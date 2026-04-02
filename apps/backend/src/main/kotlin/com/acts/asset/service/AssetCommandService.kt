package com.acts.asset.service

import com.acts.asset.api.AssetDetailResponse
import com.acts.asset.api.AssetStructuredTagsRequest
import com.acts.asset.api.AssetStructuredTagsResponse
import com.acts.asset.api.AssetTypeMetadataRequest
import com.acts.asset.api.AssetTypeMetadataResponse
import com.acts.asset.domain.AssetAuthorizationService
import com.acts.asset.domain.AssetEntity
import com.acts.asset.event.AssetEventEntity
import com.acts.asset.event.AssetEventRepository
import com.acts.asset.event.AssetEventType
import com.acts.asset.repository.AssetRepository
import com.acts.asset.tag.AssetSearchTextBuilder
import com.acts.asset.tag.AssetTagEntity
import com.acts.asset.tag.AssetTagRepository
import com.acts.asset.tag.AssetTagSuggestionService
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class AssetCommandService(
    private val assetAuthorizationService: AssetAuthorizationService,
    private val assetCatalogService: AssetCatalogService,
    private val assetEventRepository: AssetEventRepository,
    private val assetRepository: AssetRepository,
    private val assetSearchTextBuilder: AssetSearchTextBuilder,
    private val assetTagRepository: AssetTagRepository,
    private val assetTagSuggestionService: AssetTagSuggestionService,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun updateAsset(
        assetId: Long,
        title: String,
        description: String?,
        requestedTags: AssetStructuredTagsRequest,
        requestedTypeMetadata: AssetTypeMetadataRequest = AssetTypeMetadataRequest(),
        actorEmail: String,
        actorName: String?,
    ): AssetDetailResponse {
        val actor = requireActor(userAccountRepository, actorEmail)
        val asset = assetCatalogService.requireReadyAsset(assetId)
        assetAuthorizationService.requireEditAccess(actor, asset)
        val resolvedTitle = title.normalizedOrNull() ?: throw IllegalArgumentException("제목은 비어 있을 수 없습니다.")
        val resolvedDescription = description.normalizedOrNull()
        val nextTags = assetTagSuggestionService.buildTags(requestedTags)
        val previousTags = assetTagRepository.findAllByAsset_IdOrderByIdAsc(assetId)
        val previousState = AssetMetadataSnapshot(
            title = asset.title, description = asset.description,
            typeMetadata = asset.toTypeMetadataResponse(), tags = previousTags.toStructuredTagsResponse(),
        )
        val resolvedTypeMetadata = resolveTypeMetadata(
            assetType = asset.assetType, sourceKind = asset.sourceKind, request = requestedTypeMetadata,
        )

        asset.title = resolvedTitle
        asset.description = resolvedDescription
        asset.applyTypeMetadata(resolvedTypeMetadata)
        asset.searchText = assetSearchTextBuilder.buildFromCandidates(asset, nextTags)
        val savedAsset = assetRepository.save(asset)

        assetTagRepository.deleteAllByAsset_Id(assetId)
        assetTagRepository.flush()
        val savedTags = assetTagRepository.saveAll(
            nextTags.map { tagCandidate ->
                AssetTagEntity(
                    asset = asset, value = tagCandidate.value,
                    normalizedValue = tagCandidate.normalizedValue,
                    tagType = tagCandidate.tagType, source = tagCandidate.source,
                )
            },
        )

        val nextState = AssetMetadataSnapshot(
            title = savedAsset.title, description = savedAsset.description,
            typeMetadata = savedAsset.toTypeMetadataResponse(), tags = savedTags.toStructuredTagsResponse(),
        )

        if (previousState != nextState) {
            assetEventRepository.save(
                AssetEventEntity(
                    asset = savedAsset, eventType = AssetEventType.METADATA_UPDATED,
                    actorEmail = actor.email, actorName = actorName ?: actor.displayName,
                    detail = buildMetadataUpdateDetail(previousState, nextState),
                ),
            )
        }

        return assetCatalogService.getAsset(assetId = assetId, actorEmail = actor.email)
    }

    @Transactional
    fun deleteAsset(assetId: Long, actorEmail: String, actorName: String?) {
        val actor = requireActor(userAccountRepository, actorEmail)
        val asset = assetCatalogService.requireReadyAsset(assetId)
        assetAuthorizationService.requireDeleteAccess(actor, asset)

        asset.deletedAt = Instant.now()
        asset.deletedByEmail = actor.email
        asset.deletedByName = actorName ?: actor.displayName
        assetRepository.save(asset)

        assetEventRepository.save(
            AssetEventEntity(
                asset = asset, eventType = AssetEventType.DELETED,
                actorEmail = actor.email, actorName = actorName ?: actor.displayName,
                detail = "자산이 삭제되었습니다.",
            ),
        )
    }

    private fun buildMetadataUpdateDetail(previousState: AssetMetadataSnapshot, nextState: AssetMetadataSnapshot): String {
        val changedFields = buildList {
            if (previousState.title != nextState.title) add("제목")
            if (previousState.description != nextState.description) add("설명")
            if (previousState.typeMetadata != nextState.typeMetadata) add("세부 정보")
            if (previousState.tags != nextState.tags) add("태그")
        }
        return if (changedFields.isEmpty()) "메타데이터가 다시 저장되었습니다."
        else "${changedFields.joinToString(", ")} 정보가 업데이트되었습니다."
    }
}

private data class AssetMetadataSnapshot(
    val title: String,
    val description: String?,
    val typeMetadata: AssetTypeMetadataResponse,
    val tags: AssetStructuredTagsResponse,
)
