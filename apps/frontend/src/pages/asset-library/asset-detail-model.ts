import type { AssetDetailView, AssetSummaryView } from "../../api/types";

export const detailDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short"
});

export const historyLabelMap: Record<string, string> = {
  CREATED: "생성",
  DELETED: "삭제",
  METADATA_UPDATED: "수정",
  RESTORED: "복구"
};

export const statusLabelMap: Record<AssetDetailView["status"], string> = {
  READY: "리뷰 중"
};

export const typeLabelMap: Record<AssetSummaryView["type"], string> = {
  AUDIO: "오디오",
  DOCUMENT: "문서",
  IMAGE: "이미지",
  OTHER: "기타",
  SCENARIO: "시나리오",
  VIDEO: "영상"
};

export function formatFileSize(fileSizeBytes: number): string {
  if (fileSizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
