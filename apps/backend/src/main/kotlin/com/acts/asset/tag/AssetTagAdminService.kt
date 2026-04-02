package com.acts.asset.tag

import com.acts.asset.repository.AssetRepository
import com.acts.auth.domain.UserRole
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.text.Normalizer

@Service
class AssetTagAdminService(
    private val assetRepository: AssetRepository,
    private val assetSearchTextBuilder: AssetSearchTextBuilder,
    private val assetTagRepository: AssetTagRepository,
    private val characterTagAliasRepository: CharacterTagAliasRepository,
    private val characterTagRepository: CharacterTagRepository,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun getAdminCatalog(actorEmail: String): AdminAssetTagCatalogResponse {
        requireAdmin(actorEmail)
        return loadAdminCatalog()
    }

    @Transactional
    fun createCharacterTag(actorEmail: String, request: CharacterTagUpsertRequest): AdminCharacterTagResponse {
        requireAdmin(actorEmail)
        val resolvedName = request.name.normalizedTagOrThrow("캐릭터 이름은 비어 있을 수 없습니다.")
        val normalizedName = normalizedTagValue(resolvedName)
        val resolvedAliases = normalizeAliases(request.aliases)

        validateCharacterNameAvailability(normalizedName, excludeCharacterId = null)
        validateCharacterAliasAvailability(normalizedName, resolvedAliases, excludeCharacterId = null)

        val character = characterTagRepository.save(
            CharacterTagEntity(name = resolvedName, normalizedName = normalizedName, createdByEmail = actorEmail, updatedByEmail = actorEmail),
        )
        saveCharacterAliases(character, resolvedAliases)
        return loadAdminCatalog().characters.first { it.id == requireNotNull(character.id) }
    }

    @Transactional
    fun updateCharacterTag(actorEmail: String, characterId: Long, request: CharacterTagUpsertRequest): AdminCharacterTagResponse {
        requireAdmin(actorEmail)
        val character = characterTagRepository.findById(characterId).orElseThrow { IllegalArgumentException("캐릭터 태그를 찾을 수 없습니다.") }
        val previousNormalizedName = character.normalizedName
        val previousAliases = characterTagAliasRepository.findAllByCharacterTag_IdOrderByIdAsc(characterId)
        val resolvedName = request.name.normalizedTagOrThrow("캐릭터 이름은 비어 있을 수 없습니다.")
        val normalizedName = normalizedTagValue(resolvedName)
        val resolvedAliases = normalizeAliases(request.aliases)
        val aliasesChanged = previousAliases.map { it.normalizedValue } != resolvedAliases.map(::normalizedTagValue)

        validateCharacterNameAvailability(normalizedName, excludeCharacterId = characterId)
        validateCharacterAliasAvailability(normalizedName, resolvedAliases, excludeCharacterId = characterId)

        character.name = resolvedName
        character.normalizedName = normalizedName
        character.updatedByEmail = actorEmail
        characterTagRepository.save(character)

        if (aliasesChanged) {
            characterTagAliasRepository.deleteAll(previousAliases)
            characterTagAliasRepository.flush()
            saveCharacterAliases(character, resolvedAliases)
        }

        when {
            previousNormalizedName != normalizedName -> renameTagValue(
                tagType = AssetTagType.CHARACTER, currentNormalizedValue = previousNormalizedName,
                nextValue = resolvedName, failIfMissing = false,
            )
            aliasesChanged -> refreshSearchText(assetIdsByTagValue(AssetTagType.CHARACTER, previousNormalizedName))
        }

        return loadAdminCatalog().characters.first { it.id == characterId }
    }

    @Transactional
    fun deleteCharacterTag(actorEmail: String, characterId: Long) {
        requireAdmin(actorEmail)
        val character = characterTagRepository.findById(characterId).orElseThrow { IllegalArgumentException("캐릭터 태그를 찾을 수 없습니다.") }
        deleteTagValue(actorEmail, AssetTagType.CHARACTER, character.name)
        characterTagAliasRepository.deleteAll(characterTagAliasRepository.findAllByCharacterTag_IdOrderByIdAsc(characterId))
        characterTagRepository.delete(character)
    }

    @Transactional
    fun renameTag(actorEmail: String, request: AssetTagRenameRequest) {
        requireAdmin(actorEmail)
        require(request.tagType != AssetTagType.CHARACTER) { "캐릭터 태그는 별도 관리 화면에서 수정하세요." }
        val currentNormalizedValue = normalizedTagValue(request.currentValue.normalizedTagOrThrow("수정할 태그 값이 필요합니다."))
        val nextValue = request.nextValue.normalizedTagOrThrow("새 태그 값이 필요합니다.")
        renameTagValue(tagType = request.tagType, currentNormalizedValue = currentNormalizedValue, nextValue = nextValue)
    }

    @Transactional
    fun mergeTags(actorEmail: String, request: AssetTagMergeRequest) {
        requireAdmin(actorEmail)
        require(request.tagType != AssetTagType.CHARACTER) { "캐릭터 태그는 병합할 수 없습니다." }
        val sourceNormalizedValue = normalizedTagValue(request.sourceValue.normalizedTagOrThrow("병합할 source 태그가 필요합니다."))
        val targetValue = request.targetValue.normalizedTagOrThrow("병합 대상 target 태그가 필요합니다.")
        val targetNormalizedValue = normalizedTagValue(targetValue)
        require(sourceNormalizedValue != targetNormalizedValue) { "같은 태그끼리는 병합할 수 없습니다." }

        val sourceTags = assetTagRepository.findAllByTagTypeAndNormalizedValue(request.tagType, sourceNormalizedValue)
        if (sourceTags.isEmpty()) throw IllegalArgumentException("병합할 태그를 찾을 수 없습니다.")

        val assetIds = sourceTags.mapNotNull { it.asset.id }.toSet()
        val existingTargetAssetIds = assetTagRepository.findAllByAssetIdsAndTagTypeAndNormalizedValue(assetIds, request.tagType, targetNormalizedValue)
            .mapNotNull { it.asset.id }.toSet()

        val tagsToDelete = sourceTags.filter { requireNotNull(it.asset.id) in existingTargetAssetIds }
        val tagsToUpdate = sourceTags.filterNot { requireNotNull(it.asset.id) in existingTargetAssetIds }

        tagsToUpdate.forEach { tag -> tag.value = targetValue; tag.normalizedValue = targetNormalizedValue }
        assetTagRepository.saveAll(tagsToUpdate)
        assetTagRepository.deleteAll(tagsToDelete)
        refreshSearchText(assetIds)
    }

    @Transactional
    fun deleteTagValue(actorEmail: String, tagType: AssetTagType, value: String) {
        requireAdmin(actorEmail)
        val normalizedValue = normalizedTagValue(value.normalizedTagOrThrow("삭제할 태그 값이 필요합니다."))
        val tags = assetTagRepository.findAllByTagTypeAndNormalizedValue(tagType, normalizedValue)
        if (tags.isEmpty()) return
        val assetIds = tags.mapNotNull { it.asset.id }.toSet()
        assetTagRepository.deleteAll(tags)
        refreshSearchText(assetIds)
    }

    internal fun loadAdminCatalog(): AdminAssetTagCatalogResponse {
        val allAssetTags = assetTagRepository.findAll()
        val usageCount = allAssetTags.groupingBy { it.tagType to it.normalizedValue }.eachCount()
        val aliasesByCharacterId = characterTagAliasRepository.findAllWithCharacterOrderByNormalizedValueAsc()
            .groupBy({ requireNotNull(it.characterTag.id) }, { it.value })

        val characters = characterTagRepository.findAllByOrderByNameAsc().map { character ->
            AdminCharacterTagResponse(
                id = requireNotNull(character.id), name = character.name,
                aliases = aliasesByCharacterId[character.id].orEmpty(),
                usageCount = usageCount[AssetTagType.CHARACTER to character.normalizedName]?.toLong() ?: 0L,
            )
        }
        return AdminAssetTagCatalogResponse(
            characters = characters,
            locations = buildAdminTagValues(allAssetTags, AssetTagType.LOCATION),
            keywords = buildAdminTagValues(allAssetTags, AssetTagType.KEYWORD),
        )
    }

    private fun buildAdminTagValues(allTags: List<AssetTagEntity>, tagType: AssetTagType): List<AdminAssetTagValueResponse> =
        allTags.filter { it.tagType == tagType }.groupBy { it.normalizedValue }.values.map { tags ->
            AdminAssetTagValueResponse(type = tagType, value = tags.first().value, usageCount = tags.size.toLong())
        }.sortedBy { it.value.lowercase() }

    internal fun renameTagValue(tagType: AssetTagType, currentNormalizedValue: String, nextValue: String, failIfMissing: Boolean = true) {
        val nextNormalizedValue = normalizedTagValue(nextValue)
        require(currentNormalizedValue != nextNormalizedValue) { "같은 태그 값으로는 수정할 수 없습니다." }
        val tags = assetTagRepository.findAllByTagTypeAndNormalizedValue(tagType, currentNormalizedValue)
        if (tags.isEmpty()) { if (failIfMissing) throw IllegalArgumentException("수정할 태그를 찾을 수 없습니다."); return }

        val assetIds = tags.mapNotNull { it.asset.id }.toSet()
        val existingTargetAssetIds = assetTagRepository.findAllByAssetIdsAndTagTypeAndNormalizedValue(assetIds, tagType, nextNormalizedValue)
            .mapNotNull { it.asset.id }.toSet()
        val tagsToDelete = tags.filter { requireNotNull(it.asset.id) in existingTargetAssetIds }
        val tagsToUpdate = tags.filterNot { requireNotNull(it.asset.id) in existingTargetAssetIds }

        tagsToUpdate.forEach { tag -> tag.value = nextValue; tag.normalizedValue = nextNormalizedValue }
        assetTagRepository.saveAll(tagsToUpdate)
        assetTagRepository.deleteAll(tagsToDelete)
        refreshSearchText(assetIds)
    }

    private fun saveCharacterAliases(character: CharacterTagEntity, aliases: List<String>) {
        if (aliases.isEmpty()) return
        characterTagAliasRepository.saveAll(
            aliases.map { alias -> CharacterTagAliasEntity(characterTag = character, value = alias, normalizedValue = normalizedTagValue(alias)) },
        )
    }

    private fun validateCharacterNameAvailability(normalizedName: String, excludeCharacterId: Long?) {
        val existing = characterTagRepository.findByNormalizedName(normalizedName)
        if (existing != null && existing.id != excludeCharacterId) throw IllegalArgumentException("이미 존재하는 캐릭터 이름입니다.")
        val existingAlias = characterTagAliasRepository.findWithCharacterByNormalizedValue(normalizedName)
        if (existingAlias != null && existingAlias.characterTag.id != excludeCharacterId) throw IllegalArgumentException("이미 alias로 사용 중인 캐릭터 이름입니다.")
    }

    private fun validateCharacterAliasAvailability(normalizedName: String, aliases: List<String>, excludeCharacterId: Long?) {
        val normalizedAliases = aliases.map(::normalizedTagValue)
        if (normalizedAliases.any { it == normalizedName }) throw IllegalArgumentException("캐릭터 이름과 동일한 alias는 추가할 수 없습니다.")
        val duplicated = normalizedAliases.groupingBy { it }.eachCount().filterValues { it > 1 }.keys
        if (duplicated.isNotEmpty()) throw IllegalArgumentException("중복된 alias가 있습니다.")
        normalizedAliases.forEach { normalizedAlias ->
            val existingChar = characterTagRepository.findByNormalizedName(normalizedAlias)
            if (existingChar != null && existingChar.id != excludeCharacterId) throw IllegalArgumentException("다른 캐릭터 이름과 겹치는 alias가 있습니다.")
            val existingAlias = characterTagAliasRepository.findWithCharacterByNormalizedValue(normalizedAlias)
            if (existingAlias != null && existingAlias.characterTag.id != excludeCharacterId) throw IllegalArgumentException("이미 사용 중인 alias가 있습니다.")
        }
    }

    private fun normalizeAliases(aliases: List<String>): List<String> =
        aliases.mapNotNull { it.normalizedOrNull() }.distinctBy(::normalizedTagValue)

    internal fun refreshSearchText(assetIds: Set<Long>) {
        if (assetIds.isEmpty()) return
        val assetsById = assetRepository.findAllById(assetIds).associateBy { requireNotNull(it.id) }
        val tagsByAssetId = assetTagRepository.findAllByAssetIds(assetIds).groupBy { requireNotNull(it.asset.id) }
        assetsById.forEach { (assetId, asset) -> asset.searchText = assetSearchTextBuilder.build(asset, tagsByAssetId[assetId].orEmpty()) }
        assetRepository.saveAll(assetsById.values)
    }

    private fun assetIdsByTagValue(tagType: AssetTagType, normalizedValue: String): Set<Long> =
        assetTagRepository.findAllByTagTypeAndNormalizedValue(tagType, normalizedValue).mapNotNull { it.asset.id }.toSet()

    private fun requireAdmin(actorEmail: String) = userAccountRepository.findById(actorEmail.lowercase())
        .orElseThrow { IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.") }
        .also { if (it.role != UserRole.ADMIN) throw SecurityException("관리자 권한이 없습니다.") }

    private fun String.normalizedTagOrThrow(message: String): String = normalizedOrNull() ?: throw IllegalArgumentException(message)
    private fun String.normalizedOrNull(): String? = Normalizer.normalize(this, Normalizer.Form.NFC).trim().takeIf { it.isNotEmpty() }
}

internal fun normalizedTagValue(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFC)
    .trim().lowercase().replace(Regex("\\s+"), " ").take(80)
