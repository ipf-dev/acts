import type React from "react";
import { AlertCircle, CheckCircle2, FileUp, Link2, LoaderCircle, X } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import type {
  AssetUploadBatchView,
  AssetUploadTaskStatusView,
  AssetUploadTaskView
} from "./asset-library-page-model";

interface AssetUploadToastPanelProps {
  batch: AssetUploadBatchView | null;
  onDismiss: () => void;
}

export function AssetUploadToastPanel({
  batch,
  onDismiss
}: AssetUploadToastPanelProps): React.JSX.Element | null {

  if (!batch) {
    return null;
  }

  const completedCount = batch.tasks.filter((task) => task.status === "COMPLETED").length;
  const failedCount = batch.tasks.filter((task) => task.status === "FAILED").length;
  const overallProgressPercent =
    batch.kind === "FILE"
      ? resolveBatchProgressPercent(batch)
      : null;
  const title = batch.kind === "FILE" ? "애셋 업로드" : "링크 등록";

  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-40 w-[min(420px,calc(100vw-2rem))] lg:right-6">
      <Card className="pointer-events-auto overflow-hidden rounded-[24px] border-border/80 bg-card/95 shadow-[0_20px_70px_rgba(17,24,39,0.18)] backdrop-blur">
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl",
                    batch.kind === "FILE" ? "bg-primary/10 text-primary" : "bg-sky-500/10 text-sky-600"
                  )}
                >
                  {batch.kind === "FILE" ? <FileUp className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">{title}</p>
                  <p className="text-xs text-muted-foreground">
                    {completedCount}/{batch.tasks.length} 완료
                    {failedCount > 0 ? ` · ${failedCount}개 실패` : null}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BatchStatusBadge status={batch.status} />
              <Button className="h-8 w-8 rounded-full p-0" onClick={onDismiss} type="button" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {batch.kind === "FILE" ? (
            <div className="border-b border-border/70 px-5 py-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>전체 진행률</span>
                <span>{overallProgressPercent !== null ? `${overallProgressPercent}%` : "처리 중"}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300",
                    batch.status === "FAILED" ? "bg-amber-500" : "bg-primary"
                  )}
                  style={{ width: `${overallProgressPercent ?? 0}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="max-h-72 space-y-3 overflow-y-auto px-5 py-4">
            {batch.tasks.map((task) => (
              <div className="space-y-2" key={task.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {task.errorMessage ?? taskStatusLabelMap[task.status]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.totalBytes !== null ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        {resolveTaskProgressPercent(task)}%
                      </span>
                    ) : null}
                    <TaskStatusIcon status={task.status} />
                  </div>
                </div>

                {task.totalBytes !== null ? (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-300",
                        task.status === "FAILED"
                          ? "bg-amber-500"
                          : task.status === "COMPLETED"
                            ? "bg-emerald-500"
                            : "bg-primary"
                      )}
                      style={{ width: `${resolveTaskProgressPercent(task)}%` }}
                    />
                  </div>
                ) : null}
                {task.totalBytes !== null ? (
                  <p className="text-[11px] text-muted-foreground">
                    {formatUploadedBytes(task.uploadedBytes)} / {formatUploadedBytes(task.totalBytes)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BatchStatusBadge({
  status
}: {
  status: AssetUploadBatchView["status"];
}): React.JSX.Element {
  if (status === "COMPLETED") {
    return <Badge variant="success">완료</Badge>;
  }

  if (status === "FAILED") {
    return <Badge variant="warning">확인 필요</Badge>;
  }

  return <Badge>진행 중</Badge>;
}

function TaskStatusIcon({
  status
}: {
  status: AssetUploadTaskStatusView;
}): React.JSX.Element {
  if (status === "COMPLETED") {
    return <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />;
  }

  if (status === "FAILED") {
    return <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-amber-500" />;
  }

  return <LoaderCircle className="mt-0.5 h-4 w-4 flex-none animate-spin text-primary" />;
}

function resolveTaskProgressPercent(task: AssetUploadTaskView): number {
  if (task.totalBytes === null || task.totalBytes <= 0) {
    return task.status === "COMPLETED" ? 100 : 0;
  }

  if (task.status === "COMPLETED" || task.status === "FINALIZING") {
    return 100;
  }

  return Math.min(100, Math.round((task.uploadedBytes / task.totalBytes) * 100));
}

function resolveBatchProgressPercent(batch: AssetUploadBatchView): number {
  const totalBytes = batch.tasks.reduce((sum, task) => sum + (task.totalBytes ?? 0), 0);
  if (totalBytes <= 0) {
    return 0;
  }

  const uploadedBytes = batch.tasks.reduce((sum, task) => {
    if (task.totalBytes === null) {
      return sum;
    }

    if (task.status === "COMPLETED" || task.status === "FINALIZING") {
      return sum + task.totalBytes;
    }

    return sum + Math.min(task.uploadedBytes, task.totalBytes);
  }, 0);

  return Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
}

function formatUploadedBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

const taskStatusLabelMap: Record<AssetUploadTaskStatusView, string> = {
  COMPLETED: "업로드가 완료되었습니다.",
  FAILED: "업로드에 실패했습니다.",
  FINALIZING: "애셋 등록을 마무리하는 중입니다.",
  PENDING: "업로드를 준비하는 중입니다.",
  UPLOADING: "S3에 파일을 업로드하는 중입니다."
};
