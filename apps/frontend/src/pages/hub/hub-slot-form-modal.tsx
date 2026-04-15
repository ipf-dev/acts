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

interface HubSlotFormModalProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  name: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
}

export function HubSlotFormModal({
  errorMessage,
  isOpen,
  isSaving,
  name,
  onClose,
  onNameChange,
  onSubmit
}: HubSlotFormModalProps): React.JSX.Element | null {
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
              <DialogTitle className="text-[20px] leading-tight">새 슬롯 추가</DialogTitle>
              <DialogDescription className="mt-2 leading-6">
                에피소드에 새 슬롯을 추가합니다. 슬롯 이름을 정하면 현재 목록의 맨 뒤에 생성됩니다.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="rounded-[20px] border border-border bg-background px-4 py-4">
              <p className="text-sm font-medium text-foreground">슬롯 이름</p>
              <Input
                autoFocus
                className="mt-3 h-11 rounded-xl border-border bg-background"
                disabled={isSaving}
                maxLength={120}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="예: 참고 자료"
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
              {isSaving ? "저장 중..." : "슬롯 생성"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
