package com.acts.asset.service

import com.acts.asset.api.AssetCatalogCreatorOptionResponse
import com.acts.asset.api.AssetCatalogFilterOptionsResponse
import com.acts.asset.api.AssetCatalogOrganizationOptionResponse
import com.acts.asset.api.AssetCatalogPageResponse
import com.acts.asset.api.AssetDetailResponse
import com.acts.asset.api.AssetEventResponse
import com.acts.asset.api.AssetListQuery
import com.acts.asset.api.AssetSummaryResponse
import com.acts.asset.domain.AssetAccessAction
import com.acts.asset.domain.AssetAuthorizationService
import com.acts.asset.domain.AssetEntity
import com.acts.asset.domain.AssetSourceKind
import com.acts.asset.event.AssetEventRepository
import com.acts.asset.event.AssetEventType
import com.acts.asset.repository.AssetFileRepository
import com.acts.asset.repository.AssetRepository
import com.acts.asset.tag.AssetTagRepository
import com.acts.auth.user.UserAccountEntity
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service

@Service
class AssetCatalogService(
    private val assetAuthorizationService: AssetAuthorizationService,
    private val assetEventRepository: AssetEventRepository,
    private val assetFileRepository: AssetFileRepository,
    private val assetRepository: AssetRepository,
    private val assetTagRepository: AssetTagRepository,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun listAssets(
        actorEmail: String,
        query: AssetListQuery = AssetListQuery(),
    ): List<AssetSummaryResponse> {
        val actor = requireActor(userAccountRepository, actorEmail)
        val assets = assetAuthorizationService.filterVisibleAssets(
            actor = actor,
            assets = assetRepository.findAllByDeletedAtIsNullOrderByCreatedAtDescIdDesc(),
        )
        if (assets.isEmpty()) return emptyList()
        val visibleAssets = filterReadyAssets(assets).filter { asset -> asset.matches(query) }
        return buildSummaryResponses(actor, visibleAssets)
    }

    @Transactional
    fun listAssetCatalog(
        actorEmail: String,
        query: AssetListQuery = AssetListQuery(),
        page: Int = 0,
        size: Int = 24,
    ): AssetCatalogPageResponse {
        require(page >= 0) { "페이지 번호는 0 이상이어야 합니다." }
        require(size in 1..100) { "페이지 크기는 1 이상 100 이하여야 합니다." }

        val actor = requireActor(userAccountRepository, actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)

        val queryResult = assetRepository.findCatalogPage(query = query, offset = page * size, limit = size)
        val totalPages = if (queryResult.totalCount == 0L) 0 else ((queryResult.totalCount + size - 1) / size).toInt()

        return AssetCatalogPageResponse(
            items = buildSummaryResponses(actor, queryResult.assets),
            page = page, size = size, totalItems = queryResult.totalCount, totalPages = totalPages,
            hasNext = page + 1 < totalPages, hasPrevious = page > 0 && totalPages > 0,
        )
    }

    @Transactional
    fun listAssetCatalogFilterOptions(actorEmail: String): AssetCatalogFilterOptionsResponse {
        val actor = requireActor(userAccountRepository, actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)

        val filterOptions = assetRepository.findCatalogFilterOptions()
        return AssetCatalogFilterOptionsResponse(
            organizations = filterOptions.organizations.map { org ->
                AssetCatalogOrganizationOptionResponse(id = org.id, name = org.name)
            },
            creators = filterOptions.creators.map { creator ->
                AssetCatalogCreatorOptionResponse(email = creator.email, name = creator.name)
            },
        )
    }

    @Transactional
    fun getAsset(assetId: Long, actorEmail: String): AssetDetailResponse {
        val actor = requireActor(userAccountRepository, actorEmail)
        val asset = requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(actor = actor, asset = asset, action = AssetAccessAction.DETAIL_VIEW)
        val currentFile = when (asset.sourceKind) {
            AssetSourceKind.FILE -> assetFileRepository.findFirstByAsset_IdOrderByVersionNumberDescIdDesc(assetId)
                ?: throw IllegalArgumentException("현재 파일 정보를 찾을 수 없습니다.")
            AssetSourceKind.LINK -> null
        }
        val tags = assetTagRepository.findAllByAsset_IdOrderByIdAsc(assetId)
        val events = assetEventRepository.findAllByAsset_IdOrderByCreatedAtDescIdDesc(assetId)
            .map { assetEvent ->
                AssetEventResponse(
                    eventType = assetEvent.eventType, actorEmail = assetEvent.actorEmail,
                    actorName = assetEvent.actorName, detail = assetEvent.detail, createdAt = assetEvent.createdAt,
                )
            }
        return asset.toDetailResponse(
            tags = tags.toStructuredTagsResponse(), currentFile = currentFile,
            events = events, permissions = assetAuthorizationService.permissionsFor(actor, asset),
        )
    }

    internal fun requireReadyAsset(assetId: Long): AssetEntity {
        val asset = assetRepository.findByIdAndDeletedAtIsNull(assetId)
            ?: throw IllegalArgumentException("자산을 찾을 수 없습니다.")
        require(isReadyAsset(asset)) { "자산을 찾을 수 없습니다." }
        return asset
    }

    internal fun buildSummaryResponses(actor: UserAccountEntity, assets: List<AssetEntity>): List<AssetSummaryResponse> {
        if (assets.isEmpty()) return emptyList()
        val tagsByAssetId = assetTagRepository.findAllByAssetIds(assets.mapNotNull { it.id })
            .groupBy { assetTag -> requireNotNull(assetTag.asset.id) }
        return assets.map { asset ->
            asset.toSummaryResponse(
                tags = tagsByAssetId[asset.id].orEmpty().toStructuredTagsResponse(),
                permissions = assetAuthorizationService.permissionsFor(actor, asset),
            )
        }
    }

    internal fun filterReadyAssets(assets: List<AssetEntity>): List<AssetEntity> {
        if (assets.isEmpty()) return emptyList()
        val fileAssetIds = assets.filter { it.sourceKind == AssetSourceKind.FILE }.mapNotNull { it.id }
        if (fileAssetIds.isEmpty()) return assets
        val completedAssetIds = assetEventRepository.findAllByAsset_IdInAndEventType(fileAssetIds, AssetEventType.CREATED)
            .mapNotNull { event -> event.asset.id }.toSet()
        return assets.filter { asset -> asset.sourceKind == AssetSourceKind.LINK || asset.id in completedAssetIds }
    }

    private fun isReadyAsset(asset: AssetEntity): Boolean = when (asset.sourceKind) {
        AssetSourceKind.LINK -> true
        AssetSourceKind.FILE -> assetEventRepository.existsByAsset_IdAndEventType(requireNotNull(asset.id), AssetEventType.CREATED)
    }

    private fun AssetEntity.matches(query: AssetListQuery): Boolean {
        val normalizedSearchTerms = query.normalizedSearchTerms()
        val normalizedCreatorEmail = query.normalizedCreatorEmail()
        val normalizedAudioTtsVoice = query.normalizedAudioTtsVoice()
        if (normalizedSearchTerms.any { searchTerm -> !searchText.contains(searchTerm) }) return false
        if (query.assetType != null && assetType != query.assetType) return false
        if (query.organizationId != null && organization?.id != query.organizationId) return false
        if (normalizedCreatorEmail != null && !ownerEmail.equals(normalizedCreatorEmail, ignoreCase = true)) return false
        if (query.imageArtStyle != null && imageArtStyle != query.imageArtStyle) return false
        if (query.imageHasLayerFile != null && imageHasLayerFile != query.imageHasLayerFile) return false
        if (normalizedAudioTtsVoice != null && !(audioTtsVoice?.lowercase()?.contains(normalizedAudioTtsVoice) ?: false)) return false
        if (query.audioRecordingType != null && audioRecordingType != query.audioRecordingType) return false
        if (query.videoStage != null && videoStage != query.videoStage) return false
        if (query.documentKind != null && documentKind != query.documentKind) return false
        return true
    }
}
