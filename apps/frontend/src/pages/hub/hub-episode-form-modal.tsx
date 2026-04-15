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
import { Textarea } from "../../components/ui/textarea";

interface HubEpisodeFormModalProps {
  description: string;
  errorMessage: string | null;
  episodeNumber: string;
  isOpen: boolean;
  isSaving: boolean;
  mode: "CREATE" | "EDIT";
  name: string;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onEpisodeNumberChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  scopeLabel: string | null;
}

export function HubEpisodeFormModal({
  description,
  errorMessage,
  episodeNumber,
  isOpen,
  isSaving,
  mode,
  name,
  onClose,
  onDescriptionChange,
  onEpisodeNumberChange,
  onNameChange,
  onSubmit,
  scopeLabel
}: HubEpisodeFormModalProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  const isSubmitDisabled =
    isSaving || name.trim().length === 0 || (mode === "CREATE" && episodeNumber.trim().length === 0);

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={isOpen}>
      <DialogContent
        className="overflow-hidden rounded-[28px] border border-border bg-background p-0 shadow-[0_32px_120px_rgba(17,24,39,0.24)]"
        size="form"
      >
        <div className="p-6">
          <DialogHeader className="space-y-3 pr-10 text-left">
            <div className="min-w-0">
              <DialogTitle className="text-[20px] leading-tight">
                {mode === "CREATE" ? "새 에피소드 추가" : "에피소드 정보 수정"}
              </DialogTitle>
              {mode === "CREATE" ? (
                <DialogDescription className="mt-2 leading-6">
                  {scopeLabel ?? "선택한 레벨"} 아래에 새 에피소드를 추가합니다.
                </DialogDescription>
              ) : null}
            </div>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            {mode === "CREATE" ? (
              <div className="rounded-[20px] border border-border bg-background px-4 py-4">
                <p className="text-sm font-medium text-foreground">EP 번호</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="inline-flex h-11 items-center rounded-xl border border-border bg-accent px-4 text-sm font-semibold tracking-[0.14em] text-foreground">
                    EP
                  </div>
                  <Input
                    className="h-11 rounded-xl border-border bg-background"
                    disabled={isSaving}
                    inputMode="numeric"
                    max={9999}
                    min={1}
                    onChange={(event) => onEpisodeNumberChange(event.target.value)}
                    placeholder="예: 20"
                    type="number"
                    value={episodeNumber}
                  />
                </div>
              </div>
            ) : null}

            <div className="rounded-[20px] border border-border bg-background px-4 py-4">
              <p className="text-sm font-medium text-foreground">에피소드 제목</p>
              <Input
                autoFocus
                className="mt-3 h-11 rounded-xl border-border bg-background"
                disabled={isSaving}
                maxLength={120}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="예: 시장 탐험"
                value={name}
              />
            </div>

            <div className="rounded-[20px] border border-border bg-background px-4 py-4">
              <p className="text-sm font-medium text-foreground">설명</p>
              <Textarea
                className="mt-3 min-h-28 rounded-xl border-border bg-background"
                disabled={isSaving}
                maxLength={2000}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="에피소드 목적, 학습 포인트, 제작 메모를 적어두세요."
                value={description}
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
              disabled={isSubmitDisabled}
              onClick={onSubmit}
              type="button"
            >
              {isSaving ? "저장 중..." : mode === "CREATE" ? "에피소드 생성" : "변경 저장"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
