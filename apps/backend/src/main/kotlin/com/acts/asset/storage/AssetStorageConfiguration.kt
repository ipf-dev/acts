package com.acts.asset.storage

import com.acts.asset.preview.AssetPreviewProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Primary
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.lambda.LambdaClient
import software.amazon.awssdk.services.s3.S3Configuration
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.presigner.S3Presigner

@Configuration
@EnableConfigurationProperties(AssetStorageProperties::class, AssetPreviewProperties::class)
class AssetStorageConfiguration {
    @Bean
    fun s3Client(properties: AssetStorageProperties): S3Client = S3Client.builder()
        .region(Region.of(properties.region))
        .credentialsProvider(DefaultCredentialsProvider.create())
        .build()

    @Bean
    fun lambdaClient(properties: AssetStorageProperties): LambdaClient = LambdaClient.builder()
        .region(Region.of(properties.region))
        .credentialsProvider(DefaultCredentialsProvider.create())
        .build()

    @Bean
    @Primary
    fun s3Presigner(properties: AssetStorageProperties): S3Presigner = createS3Presigner(
        properties = properties,
        accelerateModeEnabled = false,
    )

    @Bean
    @Qualifier("acceleratedS3Presigner")
    fun acceleratedS3Presigner(properties: AssetStorageProperties): S3Presigner = createS3Presigner(
        properties = properties,
        accelerateModeEnabled = true,
    )

    private fun createS3Presigner(
        properties: AssetStorageProperties,
        accelerateModeEnabled: Boolean,
    ): S3Presigner = S3Presigner.builder()
        .region(Region.of(properties.region))
        .credentialsProvider(DefaultCredentialsProvider.create())
        .serviceConfiguration(
            S3Configuration.builder()
                .accelerateModeEnabled(accelerateModeEnabled)
                .checksumValidationEnabled(false)
                .build(),
        )
        .build()
}
