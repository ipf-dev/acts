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

interface HubSeriesFormModalProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  name: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
}

export function HubSeriesFormModal({
  errorMessage,
  isOpen,
  isSaving,
  name,
  onClose,
  onNameChange,
  onSubmit
}: HubSeriesFormModalProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={isOpen}>
      <DialogContent
        className="overflow-hidden rounded-[28px] border border-border bg-background p-0 shadow-[0_32px_120px_rgba(17,24,39,0.24)]"
        size="form"
      >
        <div className="p-6">
          <DialogHeader className="space-y-3 pr-10 text-left">
            <div className="min-w-0">
              <DialogTitle className="text-[20px] leading-tight">새 시리즈 추가</DialogTitle>
              <DialogDescription className="mt-2 leading-6">
                Hub 최상단에 새로운 시리즈를 추가합니다. 시리즈를 만든 뒤 원하는 Level과 EP를 이어서 구성할 수 있습니다.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="rounded-[20px] border border-border bg-background px-4 py-4">
              <p className="text-sm font-medium text-foreground">시리즈 이름</p>
              <Input
                autoFocus
                className="mt-3 h-11 rounded-xl border-border bg-background"
                disabled={isSaving}
                maxLength={120}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="예: 하모니힐즈"
                value={name}
              />
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
              disabled={isSaving || name.trim().length === 0}
              onClick={onSubmit}
              type="button"
            >
              {isSaving ? "저장 중..." : "시리즈 생성"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
