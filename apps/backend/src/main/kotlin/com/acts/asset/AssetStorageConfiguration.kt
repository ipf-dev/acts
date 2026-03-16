package com.acts.asset

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import java.net.URI

@Configuration
@EnableConfigurationProperties(AssetStorageProperties::class)
class AssetStorageConfiguration {
    @Bean
    fun s3Client(assetStorageProperties: AssetStorageProperties): S3Client = S3Client.builder()
        .endpointOverride(URI.create(assetStorageProperties.endpoint))
        .credentialsProvider(
            StaticCredentialsProvider.create(
                AwsBasicCredentials.create(
                    assetStorageProperties.accessKey,
                    assetStorageProperties.secretKey,
                ),
            ),
        )
        .region(Region.of(assetStorageProperties.region))
        .forcePathStyle(assetStorageProperties.pathStyleAccessEnabled)
        .build()
}
