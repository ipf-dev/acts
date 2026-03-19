package com.acts.asset

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.deleteIfExists

@Component
class FfmpegAssetPreviewGenerator(
    private val assetPreviewProperties: AssetPreviewProperties,
) : AssetPreviewGenerator {
    override fun generateVideoPreview(
        originalFileName: String,
        contentBytes: ByteArray,
    ): GeneratedAssetPreview? {
        val ffmpegExecutable = resolveFfmpegExecutable() ?: run {
            logger.warn("Video preview skipped because ffmpeg executable was not found.")
            return null
        }
        val inputFile = Files.createTempFile("acts-video-preview-", inputSuffix(originalFileName))
        val outputFile = Files.createTempFile("acts-video-preview-", ".jpg")

        return try {
            Files.write(inputFile, contentBytes)
            outputFile.deleteIfExists()

            val process = ProcessBuilder(
                ffmpegExecutable,
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                inputFile.toString(),
                "-frames:v",
                "1",
                "-vf",
                "thumbnail,scale=-2:720",
                "-q:v",
                "4",
                outputFile.toString(),
            )
                .redirectErrorStream(true)
                .start()

            val processOutput = process.inputStream.bufferedReader().use { bufferedReader ->
                bufferedReader.readText()
            }

            val exitCode = process.waitFor()
            if (exitCode != 0 || !Files.exists(outputFile) || Files.size(outputFile) == 0L) {
                logger.warn(
                    "Video preview generation failed for {} with exitCode={} output={}",
                    originalFileName,
                    exitCode,
                    processOutput,
                )
                return null
            }

            GeneratedAssetPreview(
                content = Files.readAllBytes(outputFile),
                contentType = "image/jpeg",
            )
        } catch (_: Exception) {
            null
        } finally {
            inputFile.deleteIfExists()
            outputFile.deleteIfExists()
        }
    }

    private fun resolveFfmpegExecutable(): String? {
        val configuredPath = assetPreviewProperties.ffmpegPath?.trim().orEmpty()
        val candidates = buildList {
            if (configuredPath.isNotEmpty()) {
                add(configuredPath)
            }
            add("/opt/homebrew/bin/ffmpeg")
            add("/usr/local/bin/ffmpeg")
            add("ffmpeg")
        }.distinct()

        return candidates.firstOrNull { candidate ->
            candidate == "ffmpeg" || Files.isExecutable(Path.of(candidate))
        }
    }

    private fun inputSuffix(originalFileName: String): String {
        val extension = originalFileName.substringAfterLast('.', "")
            .trim()
            .ifBlank { "bin" }
        return ".$extension"
    }

    companion object {
        private val logger = LoggerFactory.getLogger(FfmpegAssetPreviewGenerator::class.java)
    }
}
