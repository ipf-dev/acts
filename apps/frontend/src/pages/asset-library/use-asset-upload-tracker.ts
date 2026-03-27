import { useCallback, useReducer } from "react";
import type { AssetUploadProgress } from "../../api/client";
import type {
  AssetFileUploadDraftView,
  AssetLinkDraftView,
  AssetUploadBatchStatusView,
  AssetUploadBatchView,
  AssetUploadTaskStatusView,
  AssetUploadTaskView
} from "./asset-library-page-model";

type AssetUploadTrackerAction =
  | {
      type: "START_FILE_BATCH";
      batchId: string;
      drafts: AssetFileUploadDraftView[];
    }
  | {
      type: "START_LINK_BATCH";
      batchId: string;
      drafts: AssetLinkDraftView[];
    }
  | {
      type: "PATCH_TASK";
      batchId: string;
      taskId: string;
      patch: Partial<AssetUploadTaskView>;
    }
  | {
      type: "PATCH_ALL_TASKS";
      batchId: string;
      patch: Partial<AssetUploadTaskView>;
    }
  | {
      type: "SET_BATCH_STATUS";
      batchId: string;
      status: AssetUploadBatchStatusView;
    }
  | {
      type: "DISMISS_BATCH";
    }
  | {
      type: "DISMISS_BATCH_IF_MATCHES";
      batchId: string;
    };

interface AssetUploadTrackerValue {
  uploadBatch: AssetUploadBatchView | null;
  applyFileProgress: (batchId: string, taskId: string, progress: AssetUploadProgress) => void;
  dismissUploadBatch: () => void;
  dismissUploadBatchIfMatches: (batchId: string) => void;
  markAllTasks: (batchId: string, patch: Partial<AssetUploadTaskView>) => void;
  markBatchStatus: (batchId: string, status: AssetUploadBatchStatusView) => void;
  markTaskCompleted: (batchId: string, taskId: string) => void;
  markTaskFailed: (batchId: string, taskId: string, errorMessage: string) => void;
  startFileBatch: (batchId: string, drafts: AssetFileUploadDraftView[]) => void;
  startLinkBatch: (batchId: string, drafts: AssetLinkDraftView[]) => void;
}

export function useAssetUploadTracker(): AssetUploadTrackerValue {
  const [uploadBatch, dispatch] = useReducer(assetUploadTrackerReducer, null as AssetUploadBatchView | null);

  const startFileBatch = useCallback((batchId: string, drafts: AssetFileUploadDraftView[]) => {
    dispatch({
      type: "START_FILE_BATCH",
      batchId,
      drafts
    });
  }, []);

  const startLinkBatch = useCallback((batchId: string, drafts: AssetLinkDraftView[]) => {
    dispatch({
      type: "START_LINK_BATCH",
      batchId,
      drafts
    });
  }, []);

  const applyFileProgress = useCallback((batchId: string, taskId: string, progress: AssetUploadProgress) => {
    if (progress.phase === "PREPARING") {
      dispatch({
        type: "PATCH_TASK",
        batchId,
        taskId,
        patch: {
          errorMessage: null,
          status: "PENDING",
          totalBytes: progress.totalBytes,
          uploadedBytes: 0
        }
      });
      return;
    }

    if (progress.phase === "UPLOADING") {
      dispatch({
        type: "PATCH_TASK",
        batchId,
        taskId,
        patch: {
          errorMessage: null,
          status: "UPLOADING",
          totalBytes: progress.totalBytes,
          uploadedBytes: progress.uploadedBytes
        }
      });
      return;
    }

    dispatch({
      type: "PATCH_TASK",
      batchId,
      taskId,
      patch: {
        errorMessage: null,
        status: "FINALIZING",
        totalBytes: progress.totalBytes,
        uploadedBytes: progress.totalBytes ?? progress.uploadedBytes
      }
    });
  }, []);

  const markTaskCompleted = useCallback((batchId: string, taskId: string) => {
    dispatch({
      type: "PATCH_TASK",
      batchId,
      taskId,
      patch: {
        errorMessage: null,
        status: "COMPLETED"
      }
    });
  }, []);

  const markTaskFailed = useCallback((batchId: string, taskId: string, errorMessage: string) => {
    dispatch({
      type: "PATCH_TASK",
      batchId,
      taskId,
      patch: {
        errorMessage,
        status: "FAILED"
      }
    });
  }, []);

  const markAllTasks = useCallback((batchId: string, patch: Partial<AssetUploadTaskView>) => {
    dispatch({
      type: "PATCH_ALL_TASKS",
      batchId,
      patch
    });
  }, []);

  const markBatchStatus = useCallback((batchId: string, status: AssetUploadBatchStatusView) => {
    dispatch({
      type: "SET_BATCH_STATUS",
      batchId,
      status
    });
  }, []);

  const dismissUploadBatch = useCallback(() => {
    dispatch({
      type: "DISMISS_BATCH"
    });
  }, []);

  const dismissUploadBatchIfMatches = useCallback((batchId: string) => {
    dispatch({
      type: "DISMISS_BATCH_IF_MATCHES",
      batchId
    });
  }, []);

  return {
    uploadBatch,
    applyFileProgress,
    dismissUploadBatch,
    dismissUploadBatchIfMatches,
    markAllTasks,
    markBatchStatus,
    markTaskCompleted,
    markTaskFailed,
    startFileBatch,
    startLinkBatch
  };
}

function assetUploadTrackerReducer(
  state: AssetUploadBatchView | null,
  action: AssetUploadTrackerAction
): AssetUploadBatchView | null {
  if (action.type === "DISMISS_BATCH") {
    return null;
  }

  if (action.type === "DISMISS_BATCH_IF_MATCHES") {
    if (!state || state.id !== action.batchId) {
      return state;
    }

    return null;
  }

  if (action.type === "START_FILE_BATCH") {
    return {
      id: action.batchId,
      kind: "FILE",
      status: "RUNNING",
      tasks: action.drafts.map((draft) => ({
        id: draft.id,
        errorMessage: null,
        label: draft.title || draft.file.name,
        status: "PENDING",
        totalBytes: draft.file.size,
        uploadedBytes: 0
      }))
    };
  }

  if (action.type === "START_LINK_BATCH") {
    return {
      id: action.batchId,
      kind: "LINK",
      status: "RUNNING",
      tasks: action.drafts.map((draft) => ({
        id: draft.id,
        errorMessage: null,
        label: draft.title || draft.url,
        status: "PENDING",
        totalBytes: null,
        uploadedBytes: 0
      }))
    };
  }

  if (!state || state.id !== action.batchId) {
    return state;
  }

  if (action.type === "SET_BATCH_STATUS") {
    return {
      ...state,
      status: action.status
    };
  }

  if (action.type === "PATCH_ALL_TASKS") {
    return {
      ...state,
      tasks: state.tasks.map((task) => applyTaskPatch(task, action.patch))
    };
  }

  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === action.taskId ? applyTaskPatch(task, action.patch) : task
    )
  };
}

function applyTaskPatch(
  task: AssetUploadTaskView,
  patch: Partial<AssetUploadTaskView>
): AssetUploadTaskView {
  const nextTask = {
    ...task,
    ...patch
  };

  if (nextTask.status === "COMPLETED") {
    return {
      ...nextTask,
      totalBytes: nextTask.totalBytes,
      uploadedBytes: nextTask.totalBytes ?? nextTask.uploadedBytes
    };
  }

  if (nextTask.status === "FINALIZING") {
    return {
      ...nextTask,
      uploadedBytes: nextTask.totalBytes ?? nextTask.uploadedBytes
    };
  }

  if (nextTask.totalBytes !== null) {
    return {
      ...nextTask,
      uploadedBytes: Math.max(0, Math.min(nextTask.uploadedBytes, nextTask.totalBytes))
    };
  }

  return {
    ...nextTask,
    uploadedBytes: Math.max(0, nextTask.uploadedBytes)
  };
}
