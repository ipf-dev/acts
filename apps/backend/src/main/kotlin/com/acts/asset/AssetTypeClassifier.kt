package com.acts.asset

import org.springframework.stereotype.Component

@Component
class AssetTypeClassifier {
    fun classify(
        fileName: String,
        contentType: String?,
    ): AssetType {
        val normalizedContentType = contentType?.lowercase()
        val extension = fileName.substringAfterLast(".", "").lowercase()

        return when {
            normalizedContentType?.startsWith("image/") == true || extension in imageExtensions -> AssetType.IMAGE
            normalizedContentType?.startsWith("video/") == true || extension in videoExtensions -> AssetType.VIDEO
            normalizedContentType?.startsWith("audio/") == true || extension in audioExtensions -> AssetType.AUDIO
            extension in scenarioExtensions -> AssetType.DOCUMENT
            normalizedContentType == "application/pdf" || extension in documentExtensions -> AssetType.DOCUMENT
            else -> AssetType.OTHER
        }
    }

    fun classifyLink(
        url: String,
        linkType: String?,
    ): AssetType {
        val normalizedUrl = url.lowercase()
        return if (normalizedUrl.isNotBlank()) AssetType.URL else AssetType.OTHER
    }

    fun inferDocumentKind(
        fileName: String,
        contentType: String?,
    ): AssetDocumentKind? {
        val normalizedContentType = contentType?.lowercase()
        val extension = fileName.substringAfterLast(".", "").lowercase()

        return when {
            extension in scenarioExtensions -> AssetDocumentKind.SCENARIO
            normalizedContentType == "text/plain" && extension.isBlank() -> AssetDocumentKind.SCENARIO
            else -> null
        }
    }

    companion object {
        private val imageExtensions = setOf("png", "jpg", "jpeg", "gif", "webp", "svg")
        private val videoExtensions = setOf("mp4", "mov", "avi", "m4v", "webm")
        private val audioExtensions = setOf("mp3", "wav", "m4a", "aac", "ogg")
        private val documentExtensions = setOf("pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "zip", "ai")
        private val scenarioExtensions = setOf("txt", "md", "rtf")
    }
}
