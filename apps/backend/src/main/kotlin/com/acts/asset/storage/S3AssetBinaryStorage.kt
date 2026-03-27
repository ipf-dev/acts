package com.acts.asset.storage

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Component
import software.amazon.awssdk.core.ResponseBytes
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.CompletedMultipartUpload
import software.amazon.awssdk.services.s3.model.CompletedPart
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectResponse
import software.amazon.awssdk.services.s3.model.HeadObjectRequest
import software.amazon.awssdk.services.s3.model.NoSuchKeyException
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.S3Exception
import software.amazon.awssdk.services.s3.model.UploadPartRequest
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest
import java.time.Duration

@Component
class S3AssetBinaryStorage(
    private val assetStorageProperties: AssetStorageProperties,
    private val s3Client: S3Client,
    @Qualifier("s3Presigner")
    private val s3Presigner: S3Presigner,
    @Qualifier("acceleratedS3Presigner")
    private val acceleratedS3Presigner: S3Presigner,
) : AssetBinaryStorage {
    companion object {
        private val logger = LoggerFactory.getLogger(S3AssetBinaryStorage::class.java)
    }

    @Volatile
    private var accelerationAvailable: Boolean? = null

    override fun presignUploadUrl(
        objectKey: String,
        contentType: String,
        expirationMinutes: Long,
    ): String {
        val putObjectRequest = PutObjectRequest.builder()
            .bucket(assetStorageProperties.bucket)
            .key(objectKey)
            .contentType(contentType)
            .build()

        val presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(expirationMinutes))
            .putObjectRequest(putObjectRequest)
            .build()

        return activePresigner().presignPutObject(presignRequest).url().toString()
    }

    override fun presignDownloadUrl(
        bucket: String,
        objectKey: String,
        contentType: String,
        contentDisposition: String,
        expirationMinutes: Long,
    ): String {
        val getObjectRequest = GetObjectRequest.builder()
            .bucket(bucket)
            .key(objectKey)
            .responseContentDisposition(contentDisposition)
            .responseContentType(contentType)
            .build()

        val presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(expirationMinutes))
            .getObjectRequest(getObjectRequest)
            .build()

        return activePresigner().presignGetObject(presignRequest).url().toString()
    }

    override fun createMultipartUpload(
        objectKey: String,
        contentType: String,
    ): String {
        val request = CreateMultipartUploadRequest.builder()
            .bucket(assetStorageProperties.bucket)
            .key(objectKey)
            .contentType(contentType)
            .build()

        return s3Client.createMultipartUpload(request).uploadId()
    }

    override fun presignUploadPartUrl(
        objectKey: String,
        uploadId: String,
        partNumber: Int,
        expirationMinutes: Long,
    ): String {
        val uploadPartRequest = UploadPartRequest.builder()
            .bucket(assetStorageProperties.bucket)
            .key(objectKey)
            .uploadId(uploadId)
            .partNumber(partNumber)
            .build()

        val presignRequest = UploadPartPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(expirationMinutes))
            .uploadPartRequest(uploadPartRequest)
            .build()

        return activePresigner().presignUploadPart(presignRequest).url().toString()
    }

    override fun completeMultipartUpload(
        objectKey: String,
        uploadId: String,
        parts: List<CompletedPartInfo>,
    ) {
        val completedParts = parts
            .sortedBy { part -> part.partNumber }
            .map { part ->
                CompletedPart.builder()
                    .partNumber(part.partNumber)
                    .eTag(part.eTag)
                    .build()
            }

        s3Client.completeMultipartUpload { request ->
            request.bucket(assetStorageProperties.bucket)
                .key(objectKey)
                .uploadId(uploadId)
                .multipartUpload(
                    CompletedMultipartUpload.builder()
                        .parts(completedParts)
                        .build(),
                )
        }
    }

    override fun abortMultipartUpload(
        objectKey: String,
        uploadId: String,
    ) {
        try {
            s3Client.abortMultipartUpload { request ->
                request.bucket(assetStorageProperties.bucket)
                    .key(objectKey)
                    .uploadId(uploadId)
            }
        } catch (exception: Exception) {
            logger.warn("Failed to abort multipart upload uploadId={} objectKey={}", uploadId, objectKey, exception)
        }
    }

    override fun store(
        objectKey: String,
        contentType: String,
        content: ByteArray,
    ): StoredAssetObject {
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(assetStorageProperties.bucket)
                .key(objectKey)
                .contentType(contentType)
                .build(),
            RequestBody.fromBytes(content),
        )

        return StoredAssetObject(
            bucket = assetStorageProperties.bucket,
            objectKey = objectKey,
        )
    }

    override fun load(
        bucket: String,
        objectKey: String,
    ): LoadedAssetObject {
        val responseBytes: ResponseBytes<GetObjectResponse> = s3Client.getObjectAsBytes(
            GetObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build(),
        )

        return LoadedAssetObject(
            content = responseBytes.asByteArray(),
            contentType = responseBytes.response().contentType(),
        )
    }

    override fun loadOrNull(
        bucket: String,
        objectKey: String,
    ): LoadedAssetObject? = try {
        load(bucket = bucket, objectKey = objectKey)
    } catch (_: NoSuchKeyException) {
        null
    } catch (exception: S3Exception) {
        if (exception.statusCode() == 404) {
            null
        } else {
            throw exception
        }
    }

    override fun exists(
        bucket: String,
        objectKey: String,
    ): Boolean = try {
        s3Client.headObject(
            HeadObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build(),
        )
        true
    } catch (_: NoSuchKeyException) {
        false
    } catch (exception: S3Exception) {
        if (exception.statusCode() == 404) {
            false
        } else {
            throw exception
        }
    }

    private fun activePresigner(): S3Presigner = if (shouldUseTransferAcceleration()) {
        acceleratedS3Presigner
    } else {
        s3Presigner
    }

    private fun shouldUseTransferAcceleration(): Boolean {
        if (!assetStorageProperties.transferAccelerationEnabled) {
            return false
        }

        val cachedValue = accelerationAvailable
        if (cachedValue != null) {
            return cachedValue
        }

        synchronized(this) {
            val synchronizedCachedValue = accelerationAvailable
            if (synchronizedCachedValue != null) {
                return synchronizedCachedValue
            }

            val resolvedValue = detectTransferAcceleration()
            accelerationAvailable = resolvedValue
            return resolvedValue
        }
    }

    private fun detectTransferAcceleration(): Boolean = try {
        val status = s3Client.getBucketAccelerateConfiguration { request ->
            request.bucket(assetStorageProperties.bucket)
        }.statusAsString()
        val enabled = status.equals("Enabled", ignoreCase = true)

        if (enabled) {
            logger.info("S3 Transfer Acceleration is enabled for bucket={}", assetStorageProperties.bucket)
        } else {
            logger.info("S3 Transfer Acceleration is not enabled for bucket={}", assetStorageProperties.bucket)
        }

        enabled
    } catch (exception: Exception) {
        logger.warn(
            "Could not determine S3 Transfer Acceleration state for bucket={}. Falling back to standard endpoint.",
            assetStorageProperties.bucket,
            exception,
        )
        false
    }
}
