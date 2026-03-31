package com.acts.asset

import com.acts.asset.event.AssetEventType
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import jakarta.persistence.TypedQuery
import org.springframework.stereotype.Repository

@Repository
class AssetRepositoryImpl(
    @PersistenceContext private val entityManager: EntityManager,
) : AssetRepositoryCustom {
    override fun findCatalogPage(query: AssetListQuery, offset: Int, limit: Int): AssetCatalogQueryResult {
        val whereClause = buildWhereClause(query)
        val parameters = buildParameters(query)

        val assetQuery = entityManager.createQuery(
            """
            select asset
            from AssetEntity asset
            left join fetch asset.organization organization
            $whereClause
            order by asset.createdAt desc, asset.id desc
            """.trimIndent(),
            AssetEntity::class.java,
        )
        applyParameters(assetQuery, parameters)
        assetQuery.firstResult = offset
        assetQuery.maxResults = limit

        val countQuery = entityManager.createQuery(
            """
            select count(asset)
            from AssetEntity asset
            $whereClause
            """.trimIndent(),
            java.lang.Long::class.java,
        )
        applyParameters(countQuery, parameters)

        return AssetCatalogQueryResult(
            assets = assetQuery.resultList,
            totalCount = countQuery.singleResult.toLong(),
        )
    }

    override fun findCatalogFilterOptions(): AssetCatalogFilterOptionsResult {
        val organizations = entityManager.createQuery(
            """
            select distinct new com.acts.asset.AssetCatalogOrganizationOptionResult(organization.id, organization.name)
            from AssetEntity asset
            join asset.organization organization
            ${buildWhereClause(AssetListQuery())}
            order by organization.name asc
            """.trimIndent(),
            AssetCatalogOrganizationOptionResult::class.java,
        )
            .setParameter("linkSourceKind", AssetSourceKind.LINK)
            .setParameter("createdEventType", AssetEventType.CREATED)
            .resultList

        val creators = entityManager.createQuery(
            """
            select distinct new com.acts.asset.AssetCatalogCreatorOptionResult(asset.ownerEmail, asset.ownerName)
            from AssetEntity asset
            ${buildWhereClause(AssetListQuery())}
            order by asset.ownerName asc, asset.ownerEmail asc
            """.trimIndent(),
            AssetCatalogCreatorOptionResult::class.java,
        )
            .setParameter("linkSourceKind", AssetSourceKind.LINK)
            .setParameter("createdEventType", AssetEventType.CREATED)
            .resultList

        return AssetCatalogFilterOptionsResult(
            organizations = organizations,
            creators = creators,
        )
    }

    private fun buildWhereClause(query: AssetListQuery): String {
        val clauses = mutableListOf(
            "asset.deletedAt is null",
            "(asset.sourceKind = :linkSourceKind or exists (" +
                "select 1 from AssetEventEntity event " +
                "where event.asset = asset and event.eventType = :createdEventType" +
                "))",
        )

        query.normalizedSearchTerms().forEachIndexed { index, _ ->
            clauses += "asset.searchText like :searchTerm$index"
        }
        if (query.assetType != null) {
            clauses += "asset.assetType = :assetType"
        }
        if (query.organizationId != null) {
            clauses += "asset.organization.id = :organizationId"
        }
        if (query.normalizedCreatorEmail() != null) {
            clauses += "lower(asset.ownerEmail) = :creatorEmail"
        }
        if (query.imageArtStyle != null) {
            clauses += "asset.imageArtStyle = :imageArtStyle"
        }
        if (query.imageHasLayerFile != null) {
            clauses += "asset.imageHasLayerFile = :imageHasLayerFile"
        }
        if (query.normalizedAudioTtsVoice() != null) {
            clauses += "lower(asset.audioTtsVoice) like :audioTtsVoice"
        }
        if (query.audioRecordingType != null) {
            clauses += "asset.audioRecordingType = :audioRecordingType"
        }
        if (query.videoStage != null) {
            clauses += "asset.videoStage = :videoStage"
        }
        if (query.documentKind != null) {
            clauses += "asset.documentKind = :documentKind"
        }

        return clauses.joinToString(prefix = "where ", separator = "\n  and ")
    }

    private fun buildParameters(query: AssetListQuery): Map<String, Any> = buildMap {
        put("linkSourceKind", AssetSourceKind.LINK)
        put("createdEventType", AssetEventType.CREATED)

        query.normalizedSearchTerms().forEachIndexed { index, searchTerm ->
            put("searchTerm$index", "%$searchTerm%")
        }
        query.assetType?.let { assetType -> put("assetType", assetType) }
        query.organizationId?.let { organizationId -> put("organizationId", organizationId) }
        query.normalizedCreatorEmail()?.let { creatorEmail -> put("creatorEmail", creatorEmail) }
        query.imageArtStyle?.let { imageArtStyle -> put("imageArtStyle", imageArtStyle) }
        query.imageHasLayerFile?.let { imageHasLayerFile -> put("imageHasLayerFile", imageHasLayerFile) }
        query.normalizedAudioTtsVoice()?.let { audioTtsVoice -> put("audioTtsVoice", "%$audioTtsVoice%") }
        query.audioRecordingType?.let { audioRecordingType -> put("audioRecordingType", audioRecordingType) }
        query.videoStage?.let { videoStage -> put("videoStage", videoStage) }
        query.documentKind?.let { documentKind -> put("documentKind", documentKind) }
    }

    private fun applyParameters(query: TypedQuery<*>, parameters: Map<String, Any>) {
        parameters.forEach { (key, value) ->
            query.setParameter(key, value)
        }
    }
}
