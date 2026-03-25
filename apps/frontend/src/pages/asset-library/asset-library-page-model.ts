import type { AssetTypeView } from "../../api/types";

export interface AssetFileUploadDraftView {
  description: string;
  id: string;
  file: File;
  formatLabel: string;
  previewUrl: string | null;
  sizeLabel: string;
  suggestedHeight: number | null;
  suggestedWidth: number | null;
  tagInput: string;
  tags: string[];
  title: string;
  type: AssetTypeView;
}

export interface AssetLinkDraftView {
  id: string;
  linkType: string;
  tagInput: string;
  tags: string[];
  title: string;
  url: string;
}

export interface AssetLinkComposerView {
  linkType: string;
  tagInput: string;
  tags: string[];
  title: string;
  url: string;
}
