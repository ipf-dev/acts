package com.acts.asset.service

import com.acts.asset.api.AssetLinkRegistrationRequest
import com.acts.asset.api.AssetSummaryResponse
import com.acts.asset.domain.AssetAuthorizationService
import com.acts.asset.domain.AssetEntity
import com.acts.asset.domain.AssetSourceKind
import com.acts.asset.domain.AssetTypeClassifier
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
import java.net.URI

@Service
class AssetLinkService(
    private val assetAuthorizationService: AssetAuthorizationService,
    private val assetEventRepository: AssetEventRepository,
    private val assetRepository: AssetRepository,
    private val assetSearchTextBuilder: AssetSearchTextBuilder,
    private val assetTagRepository: AssetTagRepository,
    private val assetTagSuggestionService: AssetTagSuggestionService,
    private val assetTypeClassifier: AssetTypeClassifier,
    private val userAccountRepository: UserAccountRepository,
) {
    companion object {
        private const val LINK_MIME_TYPE = "text/uri-list"
    }

    @Transactional
    fun registerLinks(request: AssetLinkRegistrationRequest, actorEmail: String, actorName: String?): List<AssetSummaryResponse> {
        val actor = requireActor(userAccountRepository, actorEmail)
        assetAuthorizationService.requireLibraryAccess(actor)
        require(request.links.isNotEmpty()) { "등록할 링크가 없습니다." }

        return request.links.map { linkRequest ->
            val resolvedUrl = normalizeLinkUrl(
                linkRequest.url.normalizedOrNull() ?: throw IllegalArgumentException("URL은 비어 있을 수 없습니다."),
            )
            val resolvedHost = extractLinkHost(resolvedUrl)
            val resolvedLinkType = linkRequest.linkType.normalizedOrNull() ?: inferLinkType(resolvedUrl)
            val assetType = assetTypeClassifier.classifyLink(url = resolvedUrl, linkType = resolvedLinkType)
            val resolvedTitle = linkRequest.title.normalizedOrNull() ?: resolvedHost
            val tags = assetTagSuggestionService.buildTags(linkRequest.tags)

            val asset = AssetEntity(
                title = resolvedTitle, assetType = assetType, sourceKind = AssetSourceKind.LINK,
                description = null, originalFileName = resolvedHost, mimeType = LINK_MIME_TYPE,
                fileSizeBytes = 0, fileExtension = null, linkUrl = resolvedUrl, linkType = resolvedLinkType,
                ownerEmail = actor.email, ownerName = actor.displayName, organization = actor.organization,
                currentVersionNumber = 1, searchText = "", widthPx = null, heightPx = null, durationMs = null,
            )
            asset.searchText = assetSearchTextBuilder.buildFromCandidates(asset, tags)
            val savedAsset = assetRepository.save(asset)

            val savedTags = assetTagRepository.saveAll(
                tags.map { tagCandidate ->
                    AssetTagEntity(
                        asset = savedAsset, value = tagCandidate.value,
                        normalizedValue = tagCandidate.normalizedValue,
                        tagType = tagCandidate.tagType, source = tagCandidate.source,
                    )
                },
            )

            assetEventRepository.save(
                AssetEventEntity(
                    asset = savedAsset, eventType = AssetEventType.CREATED,
                    actorEmail = actor.email, actorName = actorName ?: actor.displayName,
                    detail = "외부 링크로 자산이 등록되었습니다.",
                ),
            )

            savedAsset.toSummaryResponse(
                tags = savedTags.toStructuredTagsResponse(),
                permissions = assetAuthorizationService.permissionsFor(actor, savedAsset),
            )
        }
    }

    private fun normalizeLinkUrl(value: String): String {
        val candidate = if (value.contains("://")) value else "https://$value"
        return try {
            val uri = URI.create(candidate)
            require(!uri.host.isNullOrBlank()) { "올바른 URL을 입력해 주세요." }
            uri.normalize().toString()
        } catch (_: IllegalArgumentException) {
            throw IllegalArgumentException("올바른 URL을 입력해 주세요.")
        }
    }

    private fun extractLinkHost(url: String): String = try {
        URI.create(url).host?.removePrefix("www.")?.lowercase()?.takeIf { it.isNotBlank() } ?: url
    } catch (_: IllegalArgumentException) { url }

    private fun inferLinkType(url: String): String {
        val host = extractLinkHost(url)
        return when {
            host.contains("drive.google.com") || host.contains("docs.google.com") -> "Google Drive"
            host.contains("youtube.com") || host.contains("youtu.be") -> "YouTube"
            host.contains("notion.so") || host.contains("notion.site") -> "Notion"
            else -> host
        }
    }
}
