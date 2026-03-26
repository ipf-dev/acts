import type { AssetTypeView } from "../../api/types";

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
