package com.acts.hub

import com.acts.asset.domain.AssetAuthorizationService
import com.acts.asset.service.requireActor
import com.acts.auth.user.UserAccountRepository
import jakarta.transaction.Transactional
import org.springframework.stereotype.Service

@Service
class HubNavigationService(
    private val assetAuthorizationService: AssetAuthorizationService,
    private val hubEpisodeRepository: HubEpisodeRepository,
    private val hubLevelRepository: HubLevelRepository,
    private val hubSeriesRepository: HubSeriesRepository,
    private val userAccountRepository: UserAccountRepository,
) {
    @Transactional
    fun getNavigation(actorEmail: String): HubNavigationResponse {
        requireAuthorizedActor(actorEmail)

        val seriesNodes = linkedMapOf<String, MutableHubSeriesNavigation>()

        for (series in hubSeriesRepository.findAllByOrderByNameAsc()) {
            seriesNodes[series.slug] = MutableHubSeriesNavigation(
                key = series.slug,
                label = series.name,
            )
        }

        for (level in hubLevelRepository.findAllForNavigation()) {
            val seriesNode = seriesNodes.getOrPut(level.series.slug) {
                MutableHubSeriesNavigation(
                    key = level.series.slug,
                    label = level.series.name,
                )
            }
            seriesNode.levels.getOrPut(level.slug) {
                MutableHubLevelNavigation(
                    key = level.slug,
                    label = level.name,
                )
            }
        }

        for (episode in hubEpisodeRepository.findAllForNavigation()) {
            val series = episode.level.series
            val level = episode.level
            val seriesNode = seriesNodes.getOrPut(series.slug) {
                MutableHubSeriesNavigation(
                    key = series.slug,
                    label = series.name,
                )
            }
            val levelNode = seriesNode.levels.getOrPut(level.slug) {
                MutableHubLevelNavigation(
                    key = level.slug,
                    label = level.name,
                )
            }
            levelNode.episodes += HubEpisodeNavigationResponse(
                key = episode.slug,
                code = episode.code,
                title = episode.name,
            )
        }

        return HubNavigationResponse(
            series = seriesNodes.values.map { seriesNode ->
                HubSeriesNavigationResponse(
                    key = seriesNode.key,
                    label = seriesNode.label,
                    levels = seriesNode.levels.values.map { levelNode ->
                        HubLevelNavigationResponse(
                            key = levelNode.key,
                            label = levelNode.label,
                            episodes = levelNode.episodes.toList(),
                        )
                    },
                )
            },
        )
    }
    private fun requireAuthorizedActor(actorEmail: String) {
        val actor = requireActor(userAccountRepository, actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)
    }
}

private data class MutableHubSeriesNavigation(
    val key: String,
    val label: String,
    val levels: LinkedHashMap<String, MutableHubLevelNavigation> = linkedMapOf(),
)

private data class MutableHubLevelNavigation(
    val key: String,
    val label: String,
    val episodes: MutableList<HubEpisodeNavigationResponse> = mutableListOf(),
)
