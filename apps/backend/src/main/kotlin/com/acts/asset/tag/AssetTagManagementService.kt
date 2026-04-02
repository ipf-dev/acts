package com.acts.asset.tag

import com.acts.asset.domain.AssetAuthorizationService
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service


@Service
class AssetTagManagementService(
    private val assetAuthorizationService: AssetAuthorizationService,
    private val assetTagAdminService: AssetTagAdminService,
    private val assetTagRepository: AssetTagRepository,
    private val characterTagAliasRepository: CharacterTagAliasRepository,
    private val characterTagRepository: CharacterTagRepository,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun listCharacterOptions(actorEmail: String): List<CharacterTagOptionResponse> {
        val actor = requireActor(actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)

        val aliasesByCharacterId = characterTagAliasRepository.findAllWithCharacterOrderByNormalizedValueAsc()
            .groupBy(
                keySelector = { alias -> requireNotNull(alias.characterTag.id) },
                valueTransform = { alias -> alias.value },
            )

        return characterTagRepository.findAllByOrderByNameAsc().map { character ->
            CharacterTagOptionResponse(
                id = requireNotNull(character.id),
                name = character.name,
                aliases = aliasesByCharacterId[character.id].orEmpty(),
            )
        }
    }

    @Transactional
    fun listTagOptions(actorEmail: String): AssetTagOptionCatalogResponse {
        val actor = requireActor(actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)
        return AssetTagOptionCatalogResponse(
            locations = assetTagRepository.findValueOptionsByTagType(AssetTagType.LOCATION),
            keywords = assetTagRepository.findValueOptionsByTagType(AssetTagType.KEYWORD),
        )
    }

    @Transactional
    fun characterAliasesByNormalizedName(): Map<String, List<String>> =
        characterTagAliasRepository.findAllWithCharacterOrderByNormalizedValueAsc()
            .groupBy(
                keySelector = { alias -> alias.characterTag.normalizedName },
                valueTransform = { alias -> alias.normalizedValue },
            )

    // Admin delegation methods
    fun getAdminCatalog(actorEmail: String) = assetTagAdminService.getAdminCatalog(actorEmail)
    fun createCharacterTag(actorEmail: String, request: CharacterTagUpsertRequest) = assetTagAdminService.createCharacterTag(actorEmail, request)
    fun updateCharacterTag(actorEmail: String, characterId: Long, request: CharacterTagUpsertRequest) = assetTagAdminService.updateCharacterTag(actorEmail, characterId, request)
    fun deleteCharacterTag(actorEmail: String, characterId: Long) = assetTagAdminService.deleteCharacterTag(actorEmail, characterId)
    fun renameTag(actorEmail: String, request: AssetTagRenameRequest) = assetTagAdminService.renameTag(actorEmail, request)
    fun mergeTags(actorEmail: String, request: AssetTagMergeRequest) = assetTagAdminService.mergeTags(actorEmail, request)
    fun deleteTagValue(actorEmail: String, tagType: AssetTagType, value: String) = assetTagAdminService.deleteTagValue(actorEmail, tagType, value)

    private fun requireActor(actorEmail: String) = userAccountRepository.findById(actorEmail.lowercase())
        .orElseThrow { IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.") }
}
