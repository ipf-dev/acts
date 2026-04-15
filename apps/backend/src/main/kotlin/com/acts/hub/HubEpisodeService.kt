package com.acts.hub

import com.acts.asset.domain.AssetAccessAction
import com.acts.asset.domain.AssetAuthorizationService
import com.acts.asset.service.AssetCatalogService
import com.acts.asset.service.requireActor
import com.acts.auth.user.UserAccountEntity
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class HubEpisodeService(
    private val assetAuthorizationService: AssetAuthorizationService,
    private val assetCatalogService: AssetCatalogService,
    private val hubEpisodeRepository: HubEpisodeRepository,
    private val hubLevelRepository: HubLevelRepository,
    private val hubEpisodeSlotAssetRepository: HubEpisodeSlotAssetRepository,
    private val hubEpisodeSlotRepository: HubEpisodeSlotRepository,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun createEpisode(
        levelKey: String,
        name: String,
        description: String,
        episodeNumber: Int? = null,
        actorEmail: String,
    ): HubEpisodeResponse {
        val actor = requireAuthorizedActor(actorEmail)

        val level = requireLevel(levelKey)
        val levelId = requireNotNull(level.id)
        val normalizedName = normalizeRequiredName(name, "에피소드 이름")
        val normalizedDescription = normalizeEpisodeDescription(description)
        val nextEpisodeNumber = (hubEpisodeRepository.findMaxSortOrderByLevelId(levelId) ?: 0) + 1
        val normalizedEpisodeNumber = normalizeEpisodeNumber(episodeNumber, nextEpisodeNumber)
        val episodeCode = formatEpisodeCode(normalizedEpisodeNumber)
        require(!hubEpisodeRepository.existsByLevel_IdAndCode(levelId, episodeCode)) {
            "같은 레벨에 이미 존재하는 EP 코드입니다."
        }

        val episode = hubEpisodeRepository.save(
            HubEpisodeEntity(
                level = level,
                slug = "${level.slug}-episode-${UUID.randomUUID().toString().replace("-", "")}",
                code = episodeCode,
                name = normalizedName,
                description = normalizedDescription,
                sortOrder = normalizedEpisodeNumber,
            ),
        )
        val slots = hubEpisodeSlotRepository.saveAll(
            HubDefaultEpisodeSlots.templates.map { slotTemplate ->
                HubEpisodeSlotEntity(
                    episode = episode,
                    name = slotTemplate.name,
                    sortOrder = slotTemplate.sortOrder,
                )
            },
        )

        return buildEpisodeResponse(actor, episode, slots)
    }

    @Transactional
    fun getEpisode(episodeKey: String, actorEmail: String): HubEpisodeResponse {
        val actor = requireAuthorizedActor(actorEmail)

        val episode = requireEpisode(episodeKey)
        val slots = hubEpisodeSlotRepository.findAllByEpisode_IdOrderBySortOrderAscIdAsc(requireNotNull(episode.id))
        return buildEpisodeResponse(actor, episode, slots)
    }

    @Transactional
    fun updateEpisode(
        episodeKey: String,
        name: String,
        description: String,
        actorEmail: String,
    ): HubEpisodeResponse {
        val actor = requireAuthorizedActor(actorEmail)

        val episode = requireEpisode(episodeKey)
        episode.name = normalizeRequiredName(name, "에피소드 이름")
        episode.description = normalizeEpisodeDescription(description)
        val savedEpisode = hubEpisodeRepository.save(episode)
        val slots = hubEpisodeSlotRepository.findAllByEpisode_IdOrderBySortOrderAscIdAsc(requireNotNull(savedEpisode.id))
        return buildEpisodeResponse(actor, savedEpisode, slots)
    }

    @Transactional
    fun deleteEpisode(
        episodeKey: String,
        actorEmail: String,
    ) {
        val actor = requireAuthorizedActor(actorEmail)

        val episode = requireEpisode(episodeKey)
        hubEpisodeRepository.delete(episode)
    }

    @Transactional
    fun createSlot(
        episodeKey: String,
        name: String,
        actorEmail: String,
    ): HubEpisodeSlotResponse {
        val actor = requireAuthorizedActor(actorEmail)

        val episode = requireEpisode(episodeKey)
        val episodeId = requireNotNull(episode.id)
        val normalizedSlotName = normalizeRequiredName(name, "슬롯 이름")
        require(!hubEpisodeSlotRepository.existsByEpisode_IdAndNameIgnoreCase(episodeId, normalizedSlotName)) {
            "같은 이름의 슬롯이 이미 존재합니다."
        }

        val nextSortOrder = (hubEpisodeSlotRepository.findMaxSortOrderByEpisodeId(episodeId) ?: 0) + 1
        val createdSlot = hubEpisodeSlotRepository.save(
            HubEpisodeSlotEntity(
                episode = episode,
                name = normalizedSlotName,
                sortOrder = nextSortOrder,
            ),
        )

        return buildSlotResponse(actor, createdSlot)
    }

    @Transactional
    fun assignAssetToSlot(
        episodeKey: String,
        slotId: Long,
        assetId: Long,
        actorEmail: String,
    ): HubEpisodeSlotResponse {
        require(assetId > 0) { "연결할 에셋이 필요합니다." }

        val actor = requireAuthorizedActor(actorEmail)

        val slot = requireSlot(episodeKey, slotId)
        val asset = assetCatalogService.requireReadyAsset(assetId)
        assetAuthorizationService.requireViewAccess(actor, asset, AssetAccessAction.DETAIL_VIEW)

        val persistedSlotId = requireNotNull(slot.id)
        if (!hubEpisodeSlotAssetRepository.existsBySlot_IdAndAsset_Id(persistedSlotId, assetId)) {
            hubEpisodeSlotAssetRepository.save(
                HubEpisodeSlotAssetEntity(
                    slot = slot,
                    asset = asset,
                ),
            )
        }

        return buildSlotResponse(actor, slot)
    }

    @Transactional
    fun removeAssetFromSlot(
        episodeKey: String,
        slotId: Long,
        assetId: Long,
        actorEmail: String,
    ): HubEpisodeSlotResponse {
        val actor = requireAuthorizedActor(actorEmail)

        val slot = requireSlot(episodeKey, slotId)
        val persistedSlotId = requireNotNull(slot.id)
        val slotAsset = hubEpisodeSlotAssetRepository.findBySlot_IdAndAsset_Id(persistedSlotId, assetId)
            ?: throw IllegalArgumentException("슬롯에 연결된 에셋을 찾을 수 없습니다.")
        hubEpisodeSlotAssetRepository.delete(slotAsset)
        return buildSlotResponse(actor, slot)
    }

    @Transactional
    fun deleteSlot(
        episodeKey: String,
        slotId: Long,
        actorEmail: String,
    ) {
        val actor = requireAuthorizedActor(actorEmail)

        val slot = requireSlot(episodeKey, slotId)
        hubEpisodeSlotRepository.delete(slot)
    }

    private fun requireAuthorizedActor(actorEmail: String): UserAccountEntity {
        val actor = requireActor(userAccountRepository, actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)
        return actor
    }

    private fun requireEpisode(episodeKey: String): HubEpisodeEntity =
        hubEpisodeRepository.findBySlug(episodeKey)
            ?: throw NoSuchElementException("에피소드를 찾을 수 없습니다.")

    private fun requireLevel(levelKey: String): HubLevelEntity =
        hubLevelRepository.findBySlug(levelKey)
            ?: throw NoSuchElementException("레벨을 찾을 수 없습니다.")

    private fun requireSlot(episodeKey: String, slotId: Long): HubEpisodeSlotEntity {
        val episode = requireEpisode(episodeKey)
        return hubEpisodeSlotRepository.findByIdAndEpisode_Id(slotId, requireNotNull(episode.id))
            ?: throw NoSuchElementException("에피소드 슬롯을 찾을 수 없습니다.")
    }

    private fun normalizeEpisodeDescription(description: String): String? {
        val normalizedDescription = description.trim()
        require(normalizedDescription.length <= 2000) { "에피소드 설명은 2000자 이하여야 합니다." }
        return normalizedDescription.ifEmpty { null }
    }

    private fun normalizeEpisodeNumber(episodeNumber: Int?, defaultEpisodeNumber: Int): Int {
        val normalizedEpisodeNumber = episodeNumber ?: defaultEpisodeNumber
        require(normalizedEpisodeNumber in 1..9999) {
            "에피소드 번호는 1부터 9999 사이여야 합니다."
        }
        return normalizedEpisodeNumber
    }

    private fun formatEpisodeCode(sortOrder: Int): String = "EP${sortOrder.toString().padStart(2, '0')}"

    private fun buildEpisodeResponse(
        actor: UserAccountEntity,
        episode: HubEpisodeEntity,
        slots: List<HubEpisodeSlotEntity>,
    ): HubEpisodeResponse {
        val slotIds = slots.mapNotNull(HubEpisodeSlotEntity::id)
        val slotAssets = if (slotIds.isEmpty()) {
            emptyList()
        } else {
            hubEpisodeSlotAssetRepository.findAllBySlot_IdInOrderByCreatedAtAscIdAsc(slotIds)
        }
        val slotAssetsBySlotId = slotAssets.groupBy { slotAsset -> requireNotNull(slotAsset.slot.id) }
        val linkedAssets = slotAssets.map(HubEpisodeSlotAssetEntity::asset).distinctBy { asset -> requireNotNull(asset.id) }
        val linkedAssetSummariesById = assetCatalogService.buildSummaryResponses(actor, linkedAssets)
            .associateBy { summary -> summary.id }

        return HubEpisodeResponse(
            seriesKey = episode.level.series.slug,
            seriesLabel = episode.level.series.name,
            levelKey = episode.level.slug,
            levelLabel = episode.level.name,
            episodeKey = episode.slug,
            episodeCode = episode.code,
            episodeTitle = episode.name,
            episodeDescription = episode.description,
            slots = slots.map { slot ->
                slot.toResponse(
                    slotAssetsBySlotId[slot.id]
                        .orEmpty()
                        .mapNotNull { slotAsset -> slotAsset.asset.id?.let(linkedAssetSummariesById::get) },
                )
            },
        )
    }

    private fun buildSlotResponse(
        actor: UserAccountEntity,
        slot: HubEpisodeSlotEntity,
    ): HubEpisodeSlotResponse {
        val slotAssets = hubEpisodeSlotAssetRepository.findAllBySlot_IdInOrderByCreatedAtAscIdAsc(listOf(requireNotNull(slot.id)))
        val linkedAssets = slotAssets.map(HubEpisodeSlotAssetEntity::asset)
        val linkedAssetSummaries = assetCatalogService.buildSummaryResponses(actor, linkedAssets)
        return slot.toResponse(linkedAssetSummaries)
    }

    private fun HubEpisodeSlotEntity.toResponse(linkedAssetSummaries: List<com.acts.asset.api.AssetSummaryResponse>): HubEpisodeSlotResponse =
        HubEpisodeSlotResponse(
            slotId = requireNotNull(id),
            slotName = name,
            slotOrder = sortOrder,
            linkedAssets = linkedAssetSummaries,
        )
}
