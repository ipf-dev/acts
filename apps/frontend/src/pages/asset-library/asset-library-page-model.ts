import type { AssetTypeView } from "../../dashboard-types";

export interface AssetUploadDraftView {
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
