package com.acts.asset.storage

import org.springframework.stereotype.Component
import software.amazon.awssdk.core.ResponseBytes
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectResponse
import software.amazon.awssdk.services.s3.model.NoSuchKeyException
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.S3Exception
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest
import java.time.Duration

@Component
class S3AssetBinaryStorage(
    private val assetStorageProperties: AssetStorageProperties,
    private val s3Client: S3Client,
    private val s3Presigner: S3Presigner,
) : AssetBinaryStorage {
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

        return s3Presigner.presignPutObject(presignRequest).url().toString()
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
}
