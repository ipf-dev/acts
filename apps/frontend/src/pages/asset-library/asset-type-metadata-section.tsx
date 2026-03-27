import type React from "react";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import type {
  AssetSourceKindView,
  AssetTypeMetadataInputView,
  AssetTypeMetadataView,
  AssetTypeView
} from "../../api/types";
import { cn } from "../../lib/utils";
import { AssetDataField } from "./asset-detail-section";
import {
  audioRecordingTypeOptions,
  buildAssetTypeMetadataFields,
  documentKindOptions,
  imageArtStyleOptions,
  supportsAssetTypeMetadata,
  videoStageOptions
} from "./asset-type-metadata-model";

const NONE_VALUE = "__NONE__";

interface AssetTypeMetadataEditorSectionProps {
  assetType: AssetTypeView;
  onChange: (value: AssetTypeMetadataInputView) => void;
  sourceKind?: AssetSourceKindView;
  value: AssetTypeMetadataInputView;
}

export function AssetTypeMetadataEditorSection({
  assetType,
  onChange,
  sourceKind = "FILE",
  value
}: AssetTypeMetadataEditorSectionProps): React.JSX.Element | null {
  if (!supportsAssetTypeMetadata(assetType, sourceKind)) {
    return null;
  }

  if (assetType === "IMAGE") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <MetadataField label="아트 스타일">
          <Select
            onValueChange={(nextValue) =>
              onChange({
                ...value,
                imageArtStyle:
                  nextValue === NONE_VALUE ? null : (nextValue as AssetTypeMetadataInputView["imageArtStyle"])
              })
            }
            value={value.imageArtStyle ?? NONE_VALUE}
          >
            <SelectTrigger className="h-11 rounded-xl border-border bg-background">
              <SelectValue placeholder="아트 스타일 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
              {imageArtStyleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetadataField>

        <MetadataField label="레이어 파일">
          <label className="flex h-11 items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm">
            <input
              checked={value.imageHasLayerFile ?? false}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              onChange={(event) =>
                onChange({
                  ...value,
                  imageHasLayerFile: event.target.checked
                })
              }
              type="checkbox"
            />
            <span>레이어 파일 포함</span>
          </label>
        </MetadataField>
      </div>
    );
  }

  if (assetType === "AUDIO") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <MetadataField className="sm:col-span-2" label="TTS 목소리">
          <Input
            className="h-11 rounded-xl border-border bg-background"
            onChange={(event) =>
              onChange({
                ...value,
                audioTtsVoice: event.target.value
              })
            }
            placeholder="예: Nana, Warm Female KR"
            value={value.audioTtsVoice}
          />
        </MetadataField>

        <MetadataField label="녹음 유형">
          <Select
            onValueChange={(nextValue) =>
              onChange({
                ...value,
                audioRecordingType:
                  nextValue === NONE_VALUE
                    ? null
                    : (nextValue as AssetTypeMetadataInputView["audioRecordingType"])
              })
            }
            value={value.audioRecordingType ?? NONE_VALUE}
          >
            <SelectTrigger className="h-11 rounded-xl border-border bg-background">
              <SelectValue placeholder="녹음 유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
              {audioRecordingTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetadataField>
      </div>
    );
  }

  if (assetType === "VIDEO") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <MetadataField label="영상 정보">
          <Select
            onValueChange={(nextValue) =>
              onChange({
                ...value,
                videoStage:
                  nextValue === NONE_VALUE ? null : (nextValue as AssetTypeMetadataInputView["videoStage"])
              })
            }
            value={value.videoStage ?? NONE_VALUE}
          >
            <SelectTrigger className="h-11 rounded-xl border-border bg-background">
              <SelectValue placeholder="영상 정보 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
              {videoStageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetadataField>
      </div>
    );
  }

  if (assetType === "DOCUMENT") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <MetadataField label="문서 정보">
          <Select
            onValueChange={(nextValue) =>
              onChange({
                ...value,
                documentKind:
                  nextValue === NONE_VALUE ? null : (nextValue as AssetTypeMetadataInputView["documentKind"])
              })
            }
            value={value.documentKind ?? NONE_VALUE}
          >
            <SelectTrigger className="h-11 rounded-xl border-border bg-background">
              <SelectValue placeholder="문서 정보 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>선택 안 함</SelectItem>
              {documentKindOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetadataField>
      </div>
    );
  }

  return null;
}

interface AssetTypeMetadataDisplaySectionProps {
  assetType: AssetTypeView;
  className?: string;
  sourceKind: AssetSourceKindView;
  typeMetadata: AssetTypeMetadataView | AssetTypeMetadataInputView;
}

export function AssetTypeMetadataDisplaySection({
  assetType,
  className,
  sourceKind,
  typeMetadata
}: AssetTypeMetadataDisplaySectionProps): React.JSX.Element | null {
  const fields = buildAssetTypeMetadataFields(assetType, sourceKind, typeMetadata);
  if (fields.length === 0) {
    return null;
  }

  return (
    <section className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {fields.map((field) => (
        <AssetDataField key={field.label} label={field.label} value={field.value} />
      ))}
    </section>
  );
}

function MetadataField({
  children,
  className,
  label
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}): React.JSX.Element {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
