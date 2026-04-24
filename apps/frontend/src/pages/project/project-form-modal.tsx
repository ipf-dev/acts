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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import type { ProjectOrganizationOptionView } from "../../api/types";

export type ProjectFormMode = "CREATE" | "EDIT";

interface ProjectFormModalProps {
  deadline: string;
  description: string;
  errorMessage: string | null;
  isOngoing: boolean;
  isOpen: boolean;
  isSaving: boolean;
  mode: ProjectFormMode;
  name: string;
  onClose: () => void;
  onDeadlineChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onOngoingChange: (value: boolean) => void;
  onOrganizationChange: (organizationId: number | null) => void;
  onSubmit: () => void;
  organizationId: number | null;
  organizationOptions: ProjectOrganizationOptionView[];
}

export function ProjectFormModal({
  deadline,
  description,
  errorMessage,
  isOngoing,
  isOpen,
  isSaving,
  mode,
  name,
  onClose,
  onDeadlineChange,
  onDescriptionChange,
  onNameChange,
  onOngoingChange,
  onOrganizationChange,
  onSubmit,
  organizationId,
  organizationOptions
}: ProjectFormModalProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  const dialogTitle = mode === "CREATE" ? "새 프로젝트 만들기" : "프로젝트 정보 수정";
  const dialogDescription =
    mode === "CREATE"
      ? "담당 팀을 지정하고 마감일 또는 상시 여부를 설정하세요."
      : "프로젝트 이름, 담당 팀, 마감일을 수정할 수 있습니다.";
  const submitLabel = mode === "CREATE" ? (isSaving ? "생성 중..." : "프로젝트 생성") : (isSaving ? "저장 중..." : "변경사항 저장");
  const canSubmit =
    name.trim().length > 0 &&
    organizationId !== null &&
    (isOngoing || deadline.trim().length > 0);

  function handleOngoingChange(nextChecked: boolean): void {
    onOngoingChange(nextChecked);
    if (nextChecked) {
      onDeadlineChange("");
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={isOpen}>
      <DialogContent
        className="overflow-hidden rounded-[28px] border border-border bg-background p-0 shadow-[0_32px_120px_rgba(17,24,39,0.24)]"
        size="default"
      >
        <div className="p-5">
          <DialogHeader className="pr-10 text-left">
            <DialogTitle className="text-[18px] leading-tight">{dialogTitle}</DialogTitle>
            <DialogDescription className="mt-1.5 text-xs leading-5">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="project-name">
                프로젝트 이름
              </label>
              <Input
                autoFocus
                className="h-10 rounded-xl border-border bg-background"
                disabled={isSaving}
                id="project-name"
                maxLength={120}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="예: 설날 릴스 프로젝트"
                value={name}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">담당 팀</p>
              <Select
                disabled={isSaving || organizationOptions.length === 0}
                onValueChange={(value) => onOrganizationChange(Number(value))}
                value={organizationId !== null ? String(organizationId) : undefined}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="담당 팀을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {organizationOptions.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="project-deadline">
                  마감일
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input
                    checked={isOngoing}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                    disabled={isSaving}
                    onChange={(event) => handleOngoingChange(event.target.checked)}
                    type="checkbox"
                  />
                  상시 프로젝트
                </label>
              </div>
              <Input
                className="h-10 rounded-xl border-border bg-background disabled:opacity-50"
                disabled={isSaving || isOngoing}
                id="project-deadline"
                onChange={(event) => onDeadlineChange(event.target.value)}
                type="date"
                value={deadline}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="project-description">
                설명
              </label>
              <Textarea
                className="min-h-16 rounded-xl border-border bg-background"
                disabled={isSaving}
                id="project-description"
                maxLength={2000}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="프로젝트에 대한 간단한 메모를 남겨주세요."
                value={description}
              />
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-5 border-t border-border pt-3 sm:justify-end">
            <DialogClose asChild>
              <Button
                className="h-9 rounded-xl sm:min-w-20"
                disabled={isSaving}
                type="button"
                variant="ghost"
              >
                취소
              </Button>
            </DialogClose>
            <Button
              className="h-9 rounded-xl sm:min-w-24"
              disabled={isSaving || !canSubmit}
              onClick={onSubmit}
              type="button"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
