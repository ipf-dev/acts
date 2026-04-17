import type React from "react";
import { Sparkles } from "lucide-react";
import type { PatchNoteEntryView } from "../lib/use-patch-notes";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface PatchNotesModalProps {
  isOpen: boolean;
  latestPatchNote: PatchNoteEntryView | null;
  onClose: () => void;
  onDismissForWeek: () => void;
}

const noteDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "long"
});

function formatPatchNoteDate(isoDate: string): string {
  try {
    return noteDateFormatter.format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

export function PatchNotesModal({
  isOpen,
  latestPatchNote,
  onClose,
  onDismissForWeek
}: PatchNotesModalProps): React.JSX.Element | null {
  if (latestPatchNote === null) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-xl rounded-[28px] p-0">
        <div className="space-y-5 p-7">
          <DialogHeader className="space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>업데이트 소식</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                v{latestPatchNote.version} · {formatPatchNoteDate(latestPatchNote.date)}
              </p>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {latestPatchNote.title}
              </DialogTitle>
            </div>
          </DialogHeader>

          <ul className="space-y-2.5 text-sm leading-6 text-foreground">
            {latestPatchNote.highlights.map((highlight) => (
              <li className="flex gap-3" key={highlight}>
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                <span className="text-muted-foreground">{highlight}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            매뉴얼 페이지 하단의 <strong>버전별 업데이트</strong>에서도 지난 기록을 다시 볼 수 있습니다.
          </p>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              className="h-10 rounded-xl px-3 text-sm text-muted-foreground"
              onClick={onDismissForWeek}
              type="button"
              variant="ghost"
            >
              일주일간 보지 않기
            </Button>
            <Button
              className="h-10 rounded-xl px-5"
              onClick={onClose}
              type="button"
            >
              확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
