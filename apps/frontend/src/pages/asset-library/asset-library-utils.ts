import { ApiError, type DownloadedFile } from "../../api/client";

interface AssetApiErrorMessages {
  badRequest?: string;
  denied?: string;
  fallback: string;
  notFound?: string;
  unauthorized?: string;
}

export function getAssetApiErrorMessage(
  error: unknown,
  messages: AssetApiErrorMessages
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return messages.unauthorized ?? "로그인이 필요합니다.";
    }

    if (error.status === 403) {
      return messages.denied ?? "현재 권한으로는 이 자산에 접근할 수 없습니다.";
    }

    if (error.status === 404) {
      return messages.notFound ?? "대상 자산을 찾을 수 없습니다.";
    }

    if (error.status === 400) {
      return messages.badRequest ?? messages.fallback;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return messages.fallback;
}

export function triggerFileDownload(file: DownloadedFile): void {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function buildAssetPreviewUrl(assetId: number, cacheKey: string): string {
  return `/api/assets/${assetId}/preview?v=${encodeURIComponent(cacheKey)}`;
}
