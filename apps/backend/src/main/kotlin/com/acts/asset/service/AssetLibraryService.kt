package com.acts.asset.service

import com.acts.asset.api.AssetFileAccessMode
import com.acts.asset.api.AssetLinkRegistrationRequest
import com.acts.asset.api.AssetListQuery
import com.acts.asset.api.AssetMultipartUploadCompleteRequest
import com.acts.asset.api.AssetStructuredTagsRequest
import com.acts.asset.api.AssetTypeMetadataRequest
import com.acts.asset.api.AssetUploadCompleteRequest
import com.acts.asset.api.AssetUploadIntentRequest
import com.acts.asset.preview.AssetPreviewResult
import org.springframework.stereotype.Service


@Service
class AssetLibraryService(
    private val assetUploadService: AssetUploadService,
    private val assetLinkService: AssetLinkService,
    private val assetCatalogService: AssetCatalogService,
    private val assetFileAccessService: AssetFileAccessService,
    private val assetCommandService: AssetCommandService,
) {
    fun initiateUpload(request: AssetUploadIntentRequest, actorEmail: String, actorName: String?) =
        assetUploadService.initiateUpload(request, actorEmail, actorName)

    fun initiateMultipartUpload(request: AssetUploadIntentRequest, actorEmail: String, actorName: String?) =
        assetUploadService.initiateMultipartUpload(request, actorEmail, actorName)

    fun completeMultipartUpload(assetId: Long, request: AssetMultipartUploadCompleteRequest, actorEmail: String) =
        assetUploadService.completeMultipartUpload(assetId, request, actorEmail)

    fun completeUpload(assetId: Long, request: AssetUploadCompleteRequest, actorEmail: String) =
        assetUploadService.completeUpload(assetId, request, actorEmail)

    fun registerLinks(request: AssetLinkRegistrationRequest, actorEmail: String, actorName: String?) =
        assetLinkService.registerLinks(request, actorEmail, actorName)

    fun listAssets(actorEmail: String, query: AssetListQuery = AssetListQuery()) =
        assetCatalogService.listAssets(actorEmail, query)

    fun listAssetCatalog(actorEmail: String, query: AssetListQuery = AssetListQuery(), page: Int = 0, size: Int = 24) =
        assetCatalogService.listAssetCatalog(actorEmail, query, page, size)

    fun listAssetCatalogFilterOptions(actorEmail: String) =
        assetCatalogService.listAssetCatalogFilterOptions(actorEmail)

    fun getAsset(assetId: Long, actorEmail: String) =
        assetCatalogService.getAsset(assetId, actorEmail)

    fun downloadAsset(assetId: Long, actorEmail: String) =
        assetFileAccessService.downloadAsset(assetId, actorEmail)

    fun issueFileAccessUrl(assetId: Long, actorEmail: String, mode: AssetFileAccessMode) =
        assetFileAccessService.issueFileAccessUrl(assetId, actorEmail, mode)

    fun loadPreview(assetId: Long, actorEmail: String): AssetPreviewResult =
        assetFileAccessService.loadPreview(assetId, actorEmail)

    fun exportAssets(actorEmail: String) =
        assetFileAccessService.exportAssets(actorEmail)

    fun updateAsset(
        assetId: Long, title: String, description: String?,
        requestedTags: AssetStructuredTagsRequest,
        requestedTypeMetadata: AssetTypeMetadataRequest = AssetTypeMetadataRequest(),
        actorEmail: String, actorName: String?,
    ) = assetCommandService.updateAsset(assetId, title, description, requestedTags, requestedTypeMetadata, actorEmail, actorName)

    fun deleteAsset(assetId: Long, actorEmail: String, actorName: String?) =
        assetCommandService.deleteAsset(assetId, actorEmail, actorName)
}
