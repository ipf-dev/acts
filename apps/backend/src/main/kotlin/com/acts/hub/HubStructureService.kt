package com.acts.hub

import com.acts.asset.domain.AssetAuthorizationService
import com.acts.asset.service.requireActor
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class HubStructureService(
    private val assetAuthorizationService: AssetAuthorizationService,
    private val hubLevelRepository: HubLevelRepository,
    private val hubSeriesRepository: HubSeriesRepository,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun createSeries(name: String, actorEmail: String): HubSeriesNavigationResponse {
        requireAuthorizedActor(actorEmail)

        val normalizedName = normalizeRequiredName(name, "시리즈 이름")
        require(!hubSeriesRepository.existsByNameIgnoreCase(normalizedName)) {
            "같은 이름의 시리즈가 이미 존재합니다."
        }

        val series = hubSeriesRepository.save(
            HubSeriesEntity(
                slug = generateUniqueSeriesSlug(normalizedName),
                name = normalizedName,
            ),
        )

        return HubSeriesNavigationResponse(
            key = series.slug,
            label = series.name,
            levels = emptyList(),
        )
    }

    @Transactional
    fun createLevel(seriesKey: String, levelNumber: Int?, actorEmail: String): HubLevelNavigationResponse {
        requireAuthorizedActor(actorEmail)

        val series = requireSeries(seriesKey)
        val seriesId = requireNotNull(series.id)
        val normalizedLevelNumber = normalizeLevelNumber(levelNumber)
        require(!hubLevelRepository.existsBySeries_IdAndSortOrder(seriesId, normalizedLevelNumber)) {
            "같은 시리즈에 이미 존재하는 레벨입니다."
        }

        val level = hubLevelRepository.save(
            HubLevelEntity(
                series = series,
                slug = "${series.slug}-level-$normalizedLevelNumber",
                name = formatLevelName(normalizedLevelNumber),
                sortOrder = normalizedLevelNumber,
            ),
        )

        return HubLevelNavigationResponse(
            key = level.slug,
            label = level.name,
            episodes = emptyList(),
        )
    }

    private fun requireAuthorizedActor(actorEmail: String) {
        val actor = requireActor(userAccountRepository, actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)
    }

    private fun requireSeries(seriesKey: String): HubSeriesEntity =
        hubSeriesRepository.findBySlug(seriesKey)
            ?: throw NoSuchElementException("시리즈를 찾을 수 없습니다.")


    private fun normalizeLevelNumber(levelNumber: Int?): Int {
        val normalizedLevelNumber = levelNumber ?: throw IllegalArgumentException("레벨 번호는 필수입니다.")
        require(normalizedLevelNumber in 1..9999) { "레벨 번호는 1부터 9999 사이여야 합니다." }
        return normalizedLevelNumber
    }

    private fun formatLevelName(levelNumber: Int): String = "Level $levelNumber"

    private fun generateUniqueSeriesSlug(name: String): String {
        val baseSlug = slugify(name).ifBlank { "series-${UUID.randomUUID().toString().take(8)}" }
        var candidate = baseSlug
        var suffix = 2

        while (hubSeriesRepository.existsBySlug(candidate)) {
            candidate = "${baseSlug.take(72)}-$suffix"
            suffix += 1
        }

        return candidate
    }

    private fun slugify(value: String): String =
        value
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
            .take(80)
}
