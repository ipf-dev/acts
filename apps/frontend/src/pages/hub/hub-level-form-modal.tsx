import type React from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

interface HubLevelFormModalProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  levelNumber: string;
  onClose: () => void;
  onLevelNumberChange: (value: string) => void;
  onSubmit: () => void;
  seriesLabel: string | null;
}

export function HubLevelFormModal({
  errorMessage,
  isOpen,
  isSaving,
  levelNumber,
  onClose,
  onLevelNumberChange,
  onSubmit,
  seriesLabel
}: HubLevelFormModalProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  const trimmedLevelNumber = levelNumber.trim();

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={isOpen}>
      <DialogContent
        className="overflow-hidden rounded-[28px] border border-border bg-background p-0 shadow-[0_32px_120px_rgba(17,24,39,0.24)]"
        size="form"
      >
        <div className="p-6">
          <DialogHeader className="space-y-3 pr-10 text-left">
            <div className="min-w-0">
              <DialogTitle className="text-[20px] leading-tight">새 레벨 추가</DialogTitle>
              <DialogDescription className="mt-2 leading-6">
                {seriesLabel ?? "선택한 시리즈"} 아래에 레벨을 추가합니다.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="rounded-[20px] border border-border bg-background px-4 py-4">
              <p className="text-sm font-medium text-foreground">레벨 번호</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="inline-flex h-11 items-center rounded-xl border border-border bg-accent px-4 text-sm font-semibold tracking-[0.08em] text-foreground">
                  Level
                </div>
                <Input
                  autoFocus
                  className="h-11 rounded-xl border-border bg-background"
                  disabled={isSaving}
                  inputMode="numeric"
                  max={9999}
                  min={1}
                  onChange={(event) => onLevelNumberChange(event.target.value)}
                  placeholder="예: 7"
                  type="number"
                  value={levelNumber}
                />
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-6 border-t border-border pt-4 sm:justify-end">
            <DialogClose asChild>
              <Button
                className="h-10 rounded-xl sm:min-w-24"
                disabled={isSaving}
                type="button"
                variant="ghost"
              >
                취소
              </Button>
            </DialogClose>
            <Button
              className="h-10 rounded-xl sm:min-w-28"
              disabled={isSaving || trimmedLevelNumber.length === 0}
              onClick={onSubmit}
              type="button"
            >
              {isSaving ? "저장 중..." : "레벨 생성"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
