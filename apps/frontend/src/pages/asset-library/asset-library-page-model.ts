import type { AssetTypeMetadataInputView, AssetTypeView } from "../../api/types";

export interface AssetTagDraftView {
  characterTagIds: number[];
  keywordInput: string;
  keywords: string[];
  locationInput: string;
  locations: string[];
}

export interface AssetFileUploadDraftView extends AssetTagDraftView {
  description: string;
  id: string;
  file: File;
  formatLabel: string;
  previewUrl: string | null;
  sizeLabel: string;
  suggestedHeight: number | null;
  suggestedWidth: number | null;
  title: string;
  type: AssetTypeView;
  typeMetadata: AssetTypeMetadataInputView;
}

export interface AssetLinkDraftView extends AssetTagDraftView {
  id: string;
  linkType: string;
  title: string;
  url: string;
}

export interface AssetLinkComposerView extends AssetTagDraftView {
  linkType: string;
  title: string;
  url: string;
}

export type AssetUploadBatchKindView = "FILE" | "LINK";
export type AssetUploadBatchStatusView = "RUNNING" | "COMPLETED" | "FAILED";
export type AssetUploadTaskStatusView =
  | "PENDING"
  | "UPLOADING"
  | "FINALIZING"
  | "COMPLETED"
  | "FAILED";

export interface AssetUploadTaskView {
  id: string;
  errorMessage: string | null;
  label: string;
  status: AssetUploadTaskStatusView;
  totalBytes: number | null;
  uploadedBytes: number;
}

export interface AssetUploadBatchView {
  id: string;
  kind: AssetUploadBatchKindView;
  status: AssetUploadBatchStatusView;
  tasks: AssetUploadTaskView[];
}
