package com.acts.asset.preview

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import software.amazon.awssdk.core.SdkBytes
import software.amazon.awssdk.services.lambda.LambdaClient
import software.amazon.awssdk.services.lambda.model.InvocationType
import software.amazon.awssdk.services.lambda.model.InvokeRequest

@Component
class LambdaAssetPreviewDispatcher(
    private val assetPreviewProperties: AssetPreviewProperties,
    private val lambdaClient: LambdaClient,
    private val objectMapper: ObjectMapper,
) : AssetPreviewDispatcher {
    override fun requestVideoPreview(request: VideoPreviewDispatchRequest) {
        val functionName = assetPreviewProperties.videoThumbnailLambdaFunctionName?.trim().orEmpty()
        if (functionName.isEmpty()) {
            logger.debug("Skipping video preview lambda dispatch because no function name is configured.")
            return
        }

        val payload = objectMapper.writeValueAsBytes(
            VideoPreviewLambdaPayload(
                bucket = request.bucket,
                objectKey = request.objectKey,
                previewObjectKey = request.previewObjectKey,
                originalFileName = request.originalFileName,
            ),
        )

        lambdaClient.invoke(
            InvokeRequest.builder()
                .functionName(functionName)
                .invocationType(InvocationType.EVENT)
                .payload(SdkBytes.fromByteArray(payload))
                .build(),
        )
    }

    private data class VideoPreviewLambdaPayload(
        val bucket: String,
        val objectKey: String,
        val previewObjectKey: String,
        val originalFileName: String,
    )

    companion object {
        private val logger = LoggerFactory.getLogger(LambdaAssetPreviewDispatcher::class.java)
    }
}
