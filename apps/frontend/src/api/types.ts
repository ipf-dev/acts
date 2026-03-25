export interface AppHealthView {
  ok: boolean;
  service: string;
}

export type UserRole = "USER" | "ADMIN";
export type UserMappingMode = "MANUAL" | "UNMAPPED";
export type AppFeatureKeyView = "ASSET_LIBRARY";

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
  mappingMode: UserMappingMode;
  role: UserRole;
  companyWideViewer: boolean;
  manualAssignmentRequired: boolean;
}

export interface AuthSessionView {
  authenticated: boolean;
  loginConfigured: boolean;
  allowedDomain: string;
  allowedFeatureKeys: AppFeatureKeyView[];
  user: AuthUserView | null;
}

export interface ManualAssignmentInput {
  organizationId: number;
}

export interface ViewerAllowlistInput {
  email: string;
}

export interface AppFeatureView {
  key: AppFeatureKeyView;
  label: string;
  description: string;
  implemented: boolean;
}

export interface UserFeatureAuthorizationView {
  email: string;
  displayName: string;
  organizationName: string | null;
  role: UserRole;
  featureAccessLocked: boolean;
  allowedFeatures: AppFeatureView[];
  deniedFeatures: AppFeatureView[];
}

export interface UserFeatureAccessInput {
  allowedFeatureKeys: AppFeatureKeyView[];
}

export type AssetTypeView = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "SCENARIO" | "OTHER";
export type AssetSourceKindView = "FILE" | "LINK";
export type AssetStatusView = "READY";
export interface AssetSummaryView {
  id: number;
  title: string;
  type: AssetTypeView;
  sourceKind: AssetSourceKindView;
  status: AssetStatusView;
  description: string | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileExtension: string | null;
  linkUrl: string | null;
  linkType: string | null;
  versionNumber: number;
  ownerEmail: string;
  ownerName: string;
  organizationId: number | null;
  organizationName: string | null;
  widthPx: number | null;
  heightPx: number | null;
  durationMs: number | null;
  tags: string[];
  canEdit: boolean;
  canDelete: boolean;
  canDownload: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetUploadInput {
  file: File;
  title?: string;
  description?: string;
  tags: string[];
  widthPx?: number;
  heightPx?: number;
}

export interface AssetLinkRegistrationItemInput {
  url: string;
  title?: string;
  linkType?: string;
  tags: string[];
}

export interface AssetLinkRegistrationInput {
  links: AssetLinkRegistrationItemInput[];
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
  checksumSha256: string | null;
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
  currentFile: AssetFileView | null;
  events: AssetEventView[];
}
