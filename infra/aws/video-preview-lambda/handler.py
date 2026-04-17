import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import quote

import boto3
from botocore.exceptions import ClientError


s3 = boto3.client("s3")

FFMPEG_BIN = os.getenv("FFMPEG_BIN", "/usr/bin/ffmpeg")
THUMBNAIL_AT = os.getenv("THUMBNAIL_AT", "2")
PREVIEW_HEIGHT = os.getenv("PREVIEW_HEIGHT", "720")
JPEG_QUALITY = os.getenv("JPEG_QUALITY", "4")
SOURCE_URL_EXPIRATION_SECONDS = int(os.getenv("SOURCE_URL_EXPIRATION_SECONDS", "900"))
PREVIEW_CACHE_CONTROL = os.getenv("PREVIEW_CACHE_CONTROL", "max-age=31536000, immutable")


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    bucket = required_string(event, "bucket")
    object_key = required_string(event, "objectKey")
    preview_object_key = required_string(event, "previewObjectKey")
    original_file_name = required_string(event, "originalFileName")

    if preview_exists(bucket, preview_object_key):
        return {
            "status": "skipped",
            "reason": "preview_exists",
            "previewObjectKey": preview_object_key,
        }

    source_url = build_source_presigned_url(bucket=bucket, object_key=object_key)

    with tempfile.TemporaryDirectory(prefix="acts-video-preview-") as temp_dir:
        output_path = Path(temp_dir) / "preview.jpg"
        run_ffmpeg(source_url=source_url, output_path=output_path, context=context)

        with output_path.open("rb") as preview_file:
            s3.put_object(
                Bucket=bucket,
                Key=preview_object_key,
                Body=preview_file,
                ContentType="image/jpeg",
                CacheControl=PREVIEW_CACHE_CONTROL,
                Metadata={
                    # S3 user metadata must be ASCII-only, so percent-encode any non-ASCII
                    # characters (e.g. Korean) present in the source key or original file name.
                    "source-object-key": quote(object_key, safe="/"),
                    "source-original-file-name": quote(original_file_name, safe=""),
                },
            )

    return {
        "status": "ok",
        "bucket": bucket,
        "objectKey": object_key,
        "previewObjectKey": preview_object_key,
    }


def build_source_presigned_url(bucket: str, object_key: str) -> str:
    try:
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": object_key},
            ExpiresIn=SOURCE_URL_EXPIRATION_SECONDS,
        )
    except ClientError as exception:
        raise RuntimeError(
            json.dumps(
                {
                    "message": "failed to generate presigned url for source object",
                    "bucket": bucket,
                    "objectKey": object_key,
                    "errorCode": exception.response.get("Error", {}).get("Code"),
                    "errorMessage": exception.response.get("Error", {}).get("Message"),
                },
                ensure_ascii=False,
            ),
        ) from exception


def run_ffmpeg(source_url: str, output_path: Path, context: Any) -> None:
    timeout_seconds = 55
    if context is not None and hasattr(context, "get_remaining_time_in_millis"):
        timeout_seconds = max(5, int(context.get_remaining_time_in_millis() / 1000) - 3)

    command = [
        FFMPEG_BIN,
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-ss",
        THUMBNAIL_AT,
        "-i",
        source_url,
        "-frames:v",
        "1",
        "-vf",
        f"thumbnail,scale=-2:{PREVIEW_HEIGHT}",
        "-q:v",
        JPEG_QUALITY,
        str(output_path),
    ]

    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
    )

    if completed.returncode != 0 or not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError(
            json.dumps(
                {
                    "message": "ffmpeg thumbnail generation failed",
                    "returnCode": completed.returncode,
                    "stderr": redact_presigned_url(completed.stderr)[-4000:],
                    "stdout": redact_presigned_url(completed.stdout)[-4000:],
                },
                ensure_ascii=False,
            ),
        )


def preview_exists(bucket: str, object_key: str) -> bool:
    try:
        s3.head_object(Bucket=bucket, Key=object_key)
        return True
    except ClientError as exception:
        error_code = exception.response.get("Error", {}).get("Code")
        if error_code in {"403", "404", "AccessDenied", "NoSuchKey", "NotFound"}:
            if error_code in {"403", "AccessDenied"}:
                print(
                    json.dumps(
                        {
                            "message": "preview head_object access denied, continuing with regeneration",
                            "bucket": bucket,
                            "objectKey": object_key,
                        },
                        ensure_ascii=False,
                    )
                )
            return False
        raise


_PRESIGNED_URL_PATTERN = re.compile(r"(https?://[^\s?]+)\?[^\s]*")


def redact_presigned_url(text: str) -> str:
    # ffmpeg may echo the presigned URL on errors. The query string carries AWS SigV4
    # credentials, so strip it before logging to CloudWatch.
    if not text:
        return text
    return _PRESIGNED_URL_PATTERN.sub(r"\1?<redacted>", text)


def required_string(event: dict[str, Any], key: str) -> str:
    value = event.get(key)
    if not isinstance(value, str) or value.strip() == "":
        raise ValueError(f"'{key}' is required.")
    return value.strip()
