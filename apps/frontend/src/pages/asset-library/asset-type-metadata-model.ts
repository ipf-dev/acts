import type {
  AssetAudioRecordingTypeView,
  AssetDocumentKindView,
  AssetImageArtStyleView,
  AssetSourceKindView,
  AssetTypeMetadataInputView,
  AssetTypeMetadataView,
  AssetTypeView,
  AssetVideoStageView
} from "../../api/types";

export interface AssetTypeMetadataOption<T extends string> {
  label: string;
  value: T;
}

export interface AssetTypeMetadataFieldView {
  label: string;
  value: string;
}

export const imageArtStyleOptions: AssetTypeMetadataOption<AssetImageArtStyleView>[] = [
  { label: "배경", value: "BACKGROUND" },
  { label: "캐릭터 시트", value: "CHARACTER_SHEET" },
  { label: "시안", value: "DRAFT" },
  { label: "기타", value: "OTHER" }
];

export const audioRecordingTypeOptions: AssetTypeMetadataOption<AssetAudioRecordingTypeView>[] = [
  { label: "보이스 오버", value: "VOICE_OVER" },
  { label: "챈트", value: "CHANT" },
  { label: "음악", value: "MUSIC" }
];

export const videoStageOptions: AssetTypeMetadataOption<AssetVideoStageView>[] = [
  { label: "원본", value: "SOURCE" },
  { label: "편집본", value: "EDITED" },
  { label: "최종본", value: "FINAL" }
];

export const documentKindOptions: AssetTypeMetadataOption<AssetDocumentKindView>[] = [
  { label: "시나리오", value: "SCENARIO" },
  { label: "기획서", value: "PLANNING" },
  { label: "기타", value: "OTHER" }
];

const imageArtStyleLabelMap: Record<AssetImageArtStyleView, string> = Object.fromEntries(
  imageArtStyleOptions.map((option) => [option.value, option.label])
) as Record<AssetImageArtStyleView, string>;

const audioRecordingTypeLabelMap: Record<AssetAudioRecordingTypeView, string> = Object.fromEntries(
  audioRecordingTypeOptions.map((option) => [option.value, option.label])
) as Record<AssetAudioRecordingTypeView, string>;

const videoStageLabelMap: Record<AssetVideoStageView, string> = Object.fromEntries(
  videoStageOptions.map((option) => [option.value, option.label])
) as Record<AssetVideoStageView, string>;

const documentKindLabelMap: Record<AssetDocumentKindView, string> = Object.fromEntries(
  documentKindOptions.map((option) => [option.value, option.label])
) as Record<AssetDocumentKindView, string>;

export function supportsAssetTypeMetadata(
  assetType: AssetTypeView,
  sourceKind: AssetSourceKindView
): boolean {
  return sourceKind === "FILE" && ["IMAGE", "AUDIO", "VIDEO", "DOCUMENT"].includes(assetType);
}

export function createEmptyAssetTypeMetadataInput(
  assetType: AssetTypeView,
  sourceKind: AssetSourceKindView = "FILE"
): AssetTypeMetadataInputView {
  if (!supportsAssetTypeMetadata(assetType, sourceKind)) {
    return emptyAssetTypeMetadataInput();
  }

  if (assetType === "IMAGE") {
    return {
      ...emptyAssetTypeMetadataInput(),
      imageHasLayerFile: false
    };
  }

  return emptyAssetTypeMetadataInput();
}

export function createAssetTypeMetadataInputFromView(
  assetType: AssetTypeView,
  sourceKind: AssetSourceKindView,
  value: AssetTypeMetadataView
): AssetTypeMetadataInputView {
  const baseValue = createEmptyAssetTypeMetadataInput(assetType, sourceKind);

  return {
    ...baseValue,
    imageArtStyle: value.imageArtStyle,
    imageHasLayerFile:
      assetType === "IMAGE" && sourceKind === "FILE"
        ? (value.imageHasLayerFile ?? false)
        : value.imageHasLayerFile,
    audioTtsVoice: value.audioTtsVoice ?? "",
    audioRecordingType: value.audioRecordingType,
    videoStage: value.videoStage,
    documentKind: value.documentKind
  };
}

export function buildAssetTypeMetadataFields(
  assetType: AssetTypeView,
  sourceKind: AssetSourceKindView,
  typeMetadata: AssetTypeMetadataView | AssetTypeMetadataInputView
): AssetTypeMetadataFieldView[] {
  if (!supportsAssetTypeMetadata(assetType, sourceKind)) {
    return [];
  }

  switch (assetType) {
    case "IMAGE":
      return [
        {
          label: "아트 스타일",
          value: typeMetadata.imageArtStyle ? imageArtStyleLabelMap[typeMetadata.imageArtStyle] : "미선택"
        },
        {
          label: "레이어 파일",
          value:
            typeMetadata.imageHasLayerFile === null
              ? "미입력"
              : typeMetadata.imageHasLayerFile
                ? "포함"
                : "미포함"
        }
      ];
    case "AUDIO":
      return [
        {
          label: "TTS 목소리",
          value: normalizeDisplayValue(typeMetadata.audioTtsVoice) ?? "미입력"
        },
        {
          label: "녹음 유형",
          value: typeMetadata.audioRecordingType
            ? audioRecordingTypeLabelMap[typeMetadata.audioRecordingType]
            : "미선택"
        }
      ];
    case "VIDEO":
      return [
        {
          label: "영상 정보",
          value: typeMetadata.videoStage ? videoStageLabelMap[typeMetadata.videoStage] : "미선택"
        }
      ];
    case "DOCUMENT":
      return [
        {
          label: "문서 정보",
          value: typeMetadata.documentKind ? documentKindLabelMap[typeMetadata.documentKind] : "미선택"
        }
      ];
    default:
      return [];
  }
}

function emptyAssetTypeMetadataInput(): AssetTypeMetadataInputView {
  return {
    imageArtStyle: null,
    imageHasLayerFile: null,
    audioTtsVoice: "",
    audioRecordingType: null,
    videoStage: null,
    documentKind: null
  };
}

function normalizeDisplayValue(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}
