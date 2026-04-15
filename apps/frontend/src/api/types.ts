export interface AppHealthView {
  ok: boolean;
  service: string;
}

export type UserRole = "USER" | "ADMIN";
export type UserMappingMode = "MANUAL" | "UNMAPPED";
export type AppFeatureKeyView = "ASSET_LIBRARY";
export type AssetTagTypeView = "CHARACTER" | "LOCATION" | "KEYWORD";
export type AssetImageArtStyleView = "BACKGROUND" | "CHARACTER_SHEET" | "DRAFT" | "OTHER";
export type AssetAudioRecordingTypeView = "VOICE_OVER" | "CHANT" | "MUSIC";
export type AssetVideoStageView = "SOURCE" | "EDITED" | "FINAL";
export type AssetDocumentKindView = "SCENARIO" | "PLANNING" | "OTHER";

export interface AssetStructuredTagsView {
  characters: string[];
  locations: string[];
  keywords: string[];
}

export interface AssetStructuredTagsInput {
  characterTagIds: number[];
  locations: string[];
  keywords: string[];
}

export interface HubEpisodeNavigationView {
  code: string;
  key: string;
  title: string;
}

export interface HubLevelNavigationView {
  episodes: HubEpisodeNavigationView[];
  key: string;
  label: string;
}

export interface HubSeriesNavigationView {
  key: string;
  label: string;
  levels: HubLevelNavigationView[];
}

export interface HubNavigationView {
  series: HubSeriesNavigationView[];
}

export interface HubSeriesCreateInputView {
  name: string;
}

export interface HubLevelCreateInputView {
  levelNumber: number;
}

export interface HubEpisodeUpsertInputView {
  description: string;
  episodeNumber?: number;
  name: string;
}

export interface HubEpisodeSlotCreateInputView {
  name: string;
}

export interface CharacterTagOptionView {
  id: number;
  name: string;
  aliases: string[];
}

export interface AssetTagValueOptionView {
  value: string;
  usageCount: number;
}

export interface AssetTagOptionCatalogView {
  locations: AssetTagValueOptionView[];
  keywords: AssetTagValueOptionView[];
}

export interface AssetCatalogOrganizationOptionView {
  id: number;
  name: string;
}

export interface AssetCatalogCreatorOptionView {
  email: string;
  name: string;
}

export interface AssetCatalogFilterOptionsView {
  organizations: AssetCatalogOrganizationOptionView[];
  creators: AssetCatalogCreatorOptionView[];
}

export interface AdminCharacterTagView {
  id: number;
  name: string;
  aliases: string[];
  usageCount: number;
}

export interface AdminAssetTagValueView {
  type: AssetTagTypeView;
  value: string;
  usageCount: number;
}

export interface AdminAssetTagCatalogView {
  characters: AdminCharacterTagView[];
  locations: AdminAssetTagValueView[];
  keywords: AdminAssetTagValueView[];
}

export interface CharacterTagUpsertInput {
  name: string;
  aliases: string[];
}

export interface AssetTagRenameInput {
  tagType: AssetTagTypeView;
  currentValue: string;
  nextValue: string;
}

export interface AssetTagMergeInput {
  tagType: AssetTagTypeView;
  sourceValue: string;
  targetValue: string;
}

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

export type AssetTypeView = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "URL" | "OTHER";
export type AssetSourceKindView = "FILE" | "LINK";
export type AssetFileAccessModeView = "DOWNLOAD" | "PLAYBACK";

export interface AssetTypeMetadataView {
  imageArtStyle: AssetImageArtStyleView | null;
  imageHasLayerFile: boolean | null;
  audioTtsVoice: string | null;
  audioRecordingType: AssetAudioRecordingTypeView | null;
  videoStage: AssetVideoStageView | null;
  documentKind: AssetDocumentKindView | null;
}

export interface AssetTypeMetadataInputView {
  imageArtStyle: AssetImageArtStyleView | null;
  imageHasLayerFile: boolean | null;
  audioTtsVoice: string;
  audioRecordingType: AssetAudioRecordingTypeView | null;
  videoStage: AssetVideoStageView | null;
  documentKind: AssetDocumentKindView | null;
}

export interface AssetFileAccessUrlView {
  url: string;
  fileName: string;
  contentType: string;
  expiresAt: string;
  mode: AssetFileAccessModeView;
}

export interface AssetSummaryView {
  id: number;
  title: string;
  type: AssetTypeView;
  sourceKind: AssetSourceKindView;
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
  typeMetadata: AssetTypeMetadataView;
  tags: AssetStructuredTagsView;
  searchText: string;
  canEdit: boolean;
  canDelete: boolean;
  canDownload: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HubEpisodeSlotView {
  slotId: number;
  slotName: string;
  slotOrder: number;
  linkedAssets: AssetSummaryView[];
}

export interface HubEpisodeView {
  seriesKey: string;
  seriesLabel: string;
  levelKey: string;
  levelLabel: string;
  episodeKey: string;
  episodeCode: string;
  episodeDescription: string | null;
  episodeTitle: string;
  slots: HubEpisodeSlotView[];
}

export interface HubEpisodeSlotAssetLinkInput {
  assetId: number;
}

export interface AssetCatalogPageView {
  items: AssetSummaryView[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface AssetCatalogQueryView {
  page?: number;
  size?: number;
  search?: string;
  assetType?: AssetTypeView;
  organizationId?: number;
  creatorEmail?: string;
  imageArtStyle?: AssetImageArtStyleView;
  imageHasLayerFile?: boolean;
  audioTtsVoice?: string;
  audioRecordingType?: AssetAudioRecordingTypeView;
  videoStage?: AssetVideoStageView;
  documentKind?: AssetDocumentKindView;
}

export interface AssetUploadInput {
  file: File;
  title?: string;
  description?: string;
  tags: AssetStructuredTagsInput;
  typeMetadata: AssetTypeMetadataInputView;
  widthPx?: number;
  heightPx?: number;
}

export interface AssetLinkRegistrationItemInput {
  url: string;
  title?: string;
  linkType?: string;
  tags: AssetStructuredTagsInput;
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
  tags: AssetStructuredTagsInput;
  typeMetadata: AssetTypeMetadataInputView;
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
