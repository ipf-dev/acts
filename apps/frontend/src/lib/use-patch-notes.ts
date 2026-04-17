import { useCallback, useEffect, useState } from "react";

export interface PatchNoteEntryView {
  date: string;
  highlights: string[];
  title: string;
  version: string;
}

// 최신 버전이 배열의 맨 앞에 오도록 유지합니다.
export const patchNotes: readonly PatchNoteEntryView[] = [
  {
    version: "1.1.0",
    date: "2026-04-17",
    title: "시리즈 관리 추가 및 운영 편의 개선",
    highlights: [
      "시리즈 관리 신규 추가 — 시리즈 · 에피소드 단위로 제작 자료를 정리하고, 에셋 라이브러리의 자료를 슬롯에 연결할 수 있습니다.",
      "슬롯에 여러 에셋을 한 번에 연결하고, 이미지/영상 썸네일 미리보기로 원하는 자료를 쉽게 찾을 수 있습니다.",
      "관리자가 사용자 이름을 수정하고 퇴사자를 정리할 수 있습니다. 삭제된 사용자의 업로드 자료와 이력은 그대로 보존됩니다.",
      "사이드바와 에셋 상세 화면 전반의 UI를 정돈했습니다.",
      "세션 만료 시 자동으로 로그인 화면으로 이동하며, 매뉴얼 하단에서 버전별 업데이트 기록을 확인할 수 있습니다."
    ]
  }
];

function getLatestPatchNote(): PatchNoteEntryView | null {
  return patchNotes[0] ?? null;
}

const DISMISSAL_STORAGE_KEY = "acts.patchNotes.dismissal";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface PatchNoteDismissalRecordView {
  dismissedAt: number;
  dismissedForWeek: boolean;
  version: string;
}

function readDismissalRecord(): PatchNoteDismissalRecordView | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(DISMISSAL_STORAGE_KEY);
    if (rawValue === null) {
      return null;
    }
    const parsedValue = JSON.parse(rawValue) as Partial<PatchNoteDismissalRecordView>;
    if (
      typeof parsedValue.version !== "string" ||
      typeof parsedValue.dismissedAt !== "number" ||
      typeof parsedValue.dismissedForWeek !== "boolean"
    ) {
      return null;
    }
    return {
      dismissedAt: parsedValue.dismissedAt,
      dismissedForWeek: parsedValue.dismissedForWeek,
      version: parsedValue.version
    };
  } catch {
    return null;
  }
}

function writeDismissalRecord(record: PatchNoteDismissalRecordView): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore storage errors (private mode, quota)
  }
}

function shouldShowOnMount(latestVersion: string, now: number): boolean {
  const record = readDismissalRecord();
  if (record === null) {
    return true;
  }

  // 새 버전이 나오면 이전 dismissal 기록을 무시하고 다시 표시
  if (record.version !== latestVersion) {
    return true;
  }

  if (record.dismissedForWeek) {
    return now - record.dismissedAt > ONE_WEEK_MS;
  }

  // "이번만 닫기"로 닫은 경우에는 다음 세션(페이지 재로드)마다 다시 띄움
  return false;
}

export interface PatchNotesController {
  close: () => void;
  dismissForWeek: () => void;
  isOpen: boolean;
  latestPatchNote: PatchNoteEntryView | null;
}

export function usePatchNotes(isAuthenticated: boolean): PatchNotesController {
  const latestPatchNote = getLatestPatchNote();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || latestPatchNote === null) {
      return;
    }

    if (shouldShowOnMount(latestPatchNote.version, Date.now())) {
      setIsOpen(true);
    }
  }, [isAuthenticated, latestPatchNote]);

  const close = useCallback(() => {
    if (latestPatchNote === null) {
      setIsOpen(false);
      return;
    }
    writeDismissalRecord({
      dismissedAt: Date.now(),
      dismissedForWeek: false,
      version: latestPatchNote.version
    });
    setIsOpen(false);
  }, [latestPatchNote]);

  const dismissForWeek = useCallback(() => {
    if (latestPatchNote === null) {
      setIsOpen(false);
      return;
    }
    writeDismissalRecord({
      dismissedAt: Date.now(),
      dismissedForWeek: true,
      version: latestPatchNote.version
    });
    setIsOpen(false);
  }, [latestPatchNote]);

  return {
    close,
    dismissForWeek,
    isOpen,
    latestPatchNote
  };
}
