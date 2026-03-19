package com.acts.asset

import org.springframework.stereotype.Component
import software.amazon.awssdk.core.ResponseBytes
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.CreateBucketRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectResponse
import software.amazon.awssdk.services.s3.model.HeadBucketRequest
import software.amazon.awssdk.services.s3.model.NoSuchBucketException
import software.amazon.awssdk.services.s3.model.NoSuchKeyException
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.S3Exception

@Component
class S3AssetBinaryStorage(
    private val assetStorageProperties: AssetStorageProperties,
    private val s3Client: S3Client,
) : AssetBinaryStorage {
    override fun store(
        objectKey: String,
        contentType: String,
        content: ByteArray,
    ): StoredAssetObject {
        ensureBucketExists()
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
        ensureBucketExists()

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

    private fun ensureBucketExists() {
        try {
            s3Client.headBucket(
                HeadBucketRequest.builder()
                    .bucket(assetStorageProperties.bucket)
                    .build(),
            )
        } catch (exception: NoSuchBucketException) {
            createBucketIfAllowed(exception)
        } catch (exception: S3Exception) {
            if (exception.statusCode() == 404) {
                createBucketIfAllowed(exception)
            } else {
                throw exception
            }
        }
    }

    private fun createBucketIfAllowed(cause: Exception) {
        if (!assetStorageProperties.autoCreateBucket) {
            throw cause
        }

        s3Client.createBucket(
            CreateBucketRequest.builder()
                .bucket(assetStorageProperties.bucket)
                .build(),
        )
    }
}
