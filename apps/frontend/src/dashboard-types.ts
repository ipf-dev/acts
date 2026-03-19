export interface AppHealthView {
  ok: boolean;
  service: string;
}

export type UserRole = "USER" | "ADMIN";
export type UserMappingMode = "MANUAL" | "UNMAPPED";

export interface OrganizationOptionView {
  id: number;
  name: string;
}

export interface ViewerAllowlistEntryView {
  email: string;
  effectiveCompanyWideViewer: boolean;
  createdAt: string;
}

export interface AssetRetentionPolicyView {
  trashRetentionDays: number;
  restoreEnabled: boolean;
  updatedByEmail: string;
  updatedByName: string | null;
  updatedAt: string;
}

export interface AssetRetentionPolicyInput {
  trashRetentionDays: number;
  restoreEnabled: boolean;
}

export interface AuditLogView {
  id: number;
  category: string;
  outcome: string;
  actorName: string | null;
  actorEmail: string;
  actionType: string;
  targetName: string | null;
  targetEmail: string;
  detail: string | null;
  beforeState: string | null;
  afterState: string | null;
  createdAt: string;
}

export interface AuthUserView {
  email: string;
  displayName: string;
  organizationId: number | null;
  organizationName: string | null;
  positionTitle: string | null;
  mappingMode: UserMappingMode;
  role: UserRole;
  companyWideViewer: boolean;
  manualAssignmentRequired: boolean;
}

export interface AuthSessionView {
  authenticated: boolean;
  loginConfigured: boolean;
  allowedDomain: string;
  user: AuthUserView | null;
}

export interface ManualAssignmentInput {
  organizationId: number;
  positionTitle: string;
}

export interface ViewerAllowlistInput {
  email: string;
}

export type AssetTypeView = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "SCENARIO" | "OTHER";
export type AssetStatusView = "READY";
export type AssetSourceTypeView = "EXTERNAL_UPLOAD";

export interface AssetSummaryView {
  id: number;
  title: string;
  type: AssetTypeView;
  status: AssetStatusView;
  description: string | null;
  sourceType: AssetSourceTypeView;
  sourceDetail: string | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileExtension: string | null;
  versionNumber: number;
  ownerEmail: string;
  ownerName: string;
  organizationId: number | null;
  organizationName: string | null;
  widthPx: number | null;
  heightPx: number | null;
  durationMs: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AssetUploadInput {
  file: File;
  title?: string;
  description?: string;
  sourceDetail?: string;
  tags: string[];
}

export interface DeletedAssetView {
  id: number;
  title: string;
  type: AssetTypeView;
  ownerEmail: string;
  ownerName: string;
  organizationName: string | null;
  originalFileName: string;
  deletedAt: string;
  deletedByEmail: string | null;
  deletedByName: string | null;
  restoreDeadlineAt: string;
  canRestore: boolean;
}

export interface AssetUpdateInput {
  title: string;
  description?: string;
  tags: string[];
}

export interface AssetFileView {
  bucketName: string;
  objectKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  versionNumber: number;
  createdByEmail: string;
  createdByName: string;
  createdAt: string;
}

export interface AssetEventView {
  eventType: "CREATED" | "METADATA_UPDATED" | "DELETED" | "RESTORED";
  actorEmail: string;
  actorName: string | null;
  detail: string | null;
  createdAt: string;
}

export interface AssetDetailView extends AssetSummaryView {
  currentFile: AssetFileView;
  events: AssetEventView[];
}
