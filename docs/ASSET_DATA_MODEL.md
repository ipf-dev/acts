# Asset Data Model

## Goal

이 문서는 ACTS의 자산 업로드, 자동 분류, 태깅, 중복 감지, 버전 관리,
외부 업로드, 제작 이력 관리 요구사항을 만족시키기 위한 **엔티티/테이블 기준안**이다.

핵심 목표:

- `한복 토니` 같은 검색어가 태그와 메타데이터를 통해 바로 검색될 것
- 멀티 파일 업로드와 외부 자산 등록을 같은 자산 모델로 다룰 것
- 자산의 버전, 이력, 복구, 중복 판정을 추적할 것
- 조직/제작자 기준 조회와 통계를 낼 수 있을 것

## Current Slice

현재 실제 구현은 아래 최소 세트만 먼저 들어갔다.

- `assets`
- `asset_files`
- `asset_tags`
- `asset_events`

이 네 테이블로 먼저 해결하는 범위:

- LocalStack S3 업로드
- 제목/파일명/태그/제작자/조직 기준 검색 기반
- 등록 이력 시작점
- 이후 버전/중복/파생본 확장을 위한 anchor

아직 미구현이지만 설계만 열어둔 항목:

- `asset_versions`
- `asset_file_media_metadata`
- `asset_derivatives`
- `upload_sessions`
- duplicate candidate/linking 계열 테이블

## Storage Decision

권장 저장 구조:

- metadata: `PostgreSQL`
- binary file: `S3`
- local dev: `LocalStack S3`
- production: `AWS S3`

즉, 로컬도 S3 인터페이스를 그대로 사용한다.

## Core Modeling Rule

ACTS에서는 **논리 자산(asset)** 과 **실제 파일(file object)**, 그리고 **버전(version)** 을 분리한다.

- `asset`: 사용자가 검색하고 관리하는 대표 자산
- `asset_version`: 자산의 특정 시점 스냅샷
- `asset_file`: 특정 버전에 연결된 실제 저장 파일

이렇게 해야:

- 이전 버전 복구
- 동일 자산의 새 버전 저장
- 외부 업로드와 AI 생성 결과 통합
- 파일 메타데이터와 편집 이력 분리

가 쉬워진다.

## Recommended Table Groups

### A. Organization And User Reference

#### 1. `organizations`

현재 이미 존재하는 단일 조직 마스터.

주요 컬럼:

- `id bigint pk`
- `name varchar(120) unique`
- `created_at`
- `updated_at`

역할:

- 자산 소속 조직
- 제작 현황 집계 기준
- 조직 필터 기준

#### 2. `user_accounts`

현재 이미 존재하는 사용자 디렉터리.

추가 활용:

- `organization_id`
- `display_name`
- `company_wide_viewer`

역할:

- 제작자 기준 필터
- 담당자 자동 기록

### B. Asset Master

#### 3. `assets`

모든 자산의 대표 레코드. 이미지/글/오디오/비디오/문서/기타를 여기서 시작한다.

주요 컬럼:

- `id uuid pk`
- `asset_type varchar(32) not null`
  - `IMAGE`, `TEXT`, `AUDIO`, `VIDEO`, `DOCUMENT`, `OTHER`
- `source_type varchar(32) not null`
  - `USER_UPLOAD`, `AI_GENERATED`, `EXTERNAL_UPLOAD`, `MIGRATION_IMPORT`
- `title varchar(255) not null`
- `description text null`
- `organization_id bigint not null fk`
- `owner_user_email varchar(255) not null`
- `created_by_email varchar(255) not null`
- `updated_by_email varchar(255) not null`
- `current_version_id uuid null`
- `story_relation_type varchar(32) not null`
  - `BOOK_STORY_RELATED`, `GENERAL_PROMO`, `UNSPECIFIED`
- `origin_record_id uuid null`
- `is_external_registered boolean not null default false`
- `metadata jsonb not null default '{}'::jsonb`
- `search_text text not null default ''`
- `created_at timestamp not null`
- `updated_at timestamp not null`
- `deleted_at timestamp null`

핵심 역할:

- 목록/검색/상세의 기준 테이블
- 태그, 폴더, 즐겨찾기, 버전의 anchor
- 자산 상태 값 없이도 검색과 권한, 이력을 묶는 대표 anchor

설계 포인트:

- `search_text`는 제목, 설명, 파일명, 태그, 생성 루트, 캐릭터, 배경 등을 합쳐 저장하는 denormalized 컬럼이다.
- PostgreSQL `pg_trgm` 인덱스를 여기에 붙이면 태그 기반 검색 MVP가 빠르게 나온다.

### C. Version And History

#### 4. `asset_versions`

자산의 특정 시점 버전. 복구 가능성을 위해 반드시 필요하다.

주요 컬럼:

- `id uuid pk`
- `asset_id uuid not null fk`
- `version_no integer not null`
- `change_type varchar(32) not null`
  - `CREATE`, `UPLOAD_REPLACE`, `METADATA_EDIT`, `RESTORE`, `EXTERNAL_ATTACH`
- `change_summary varchar(255) null`
- `created_by_email varchar(255) not null`
- `created_by_organization_id bigint null`
- `source_version_id uuid null`
- `status varchar(32) not null`
  - `READY`, `FAILED`, `ROLLED_BACK`
- `title_snapshot varchar(255) not null`
- `description_snapshot text null`
- `organization_id_snapshot bigint not null`
- `metadata_snapshot jsonb not null`
- `created_at timestamp not null`

제약:

- `unique(asset_id, version_no)`

핵심 역할:

- 이전 버전 복구
- 어떤 메타데이터가 언제 어떻게 바뀌었는지 표시
- 시각적 변경 이력 타임라인의 기준

#### 5. `asset_events`

버전 외 운영 이벤트 로그.

주요 컬럼:

- `id bigserial pk`
- `asset_id uuid not null fk`
- `asset_version_id uuid null fk`
- `event_type varchar(32) not null`
  - `UPLOAD_REQUESTED`, `UPLOAD_COMPLETED`, `METADATA_UPDATED`, `TAG_ADDED`, `RESTORED`, `TRASHED`, `PURGED`
- `actor_email varchar(255) not null`
- `actor_organization_id bigint null`
- `detail text null`
- `before_state jsonb null`
- `after_state jsonb null`
- `created_at timestamp not null`

핵심 역할:

- 제작 이력 타임라인
- 상세 화면 히스토리
- 감사 목적의 변경 기록

### D. File Storage

#### 6. `asset_files`

실제 바이너리 파일 정보.

주요 컬럼:

- `id uuid pk`
- `asset_version_id uuid not null fk`
- `file_role varchar(32) not null`
  - `PRIMARY`, `SOURCE`
- `storage_provider varchar(32) not null default 'S3'`
- `storage_bucket varchar(120) not null`
- `storage_key varchar(500) not null`
- `original_filename varchar(255) not null`
- `normalized_filename varchar(255) not null`
- `file_extension varchar(32) null`
- `mime_type varchar(120) not null`
- `declared_format varchar(64) null`
  - 사용자가 `PDF`, `AI`, `ZIP` 등 직접 넣는 값
- `size_bytes bigint not null`
- `sha256 varchar(64) null`
- `etag varchar(128) null`
- `perceptual_hash varchar(128) null`
- `audio_fingerprint varchar(255) null`
- `upload_status varchar(32) not null`
  - `ISSUED`, `UPLOADING`, `UPLOADED`, `VERIFIED`, `FAILED`
- `created_by_email varchar(255) not null`
- `created_at timestamp not null`

제약:

- `unique(storage_bucket, storage_key)`

핵심 역할:

- exact duplicate detection
- 파일명/확장자 기반 자동 분류
- 원본 파일 이력 관리

#### 7. `asset_file_media_metadata`

파일에서 자동 추출한 공통 메타데이터.

주요 컬럼:

- `asset_file_id uuid pk fk`
- `width integer null`
- `height integer null`
- `duration_ms bigint null`
- `frame_rate numeric(6,3) null`
- `sample_rate integer null`
- `channels integer null`
- `bitrate_kbps integer null`
- `page_count integer null`
- `language_code varchar(16) null`
- `extracted_level varchar(64) null`
- `raw_metadata jsonb not null`
- `extracted_at timestamp not null`

핵심 역할:

- 형식/길이/해상도 자동 추출
- 이후 필터/통계 기반

#### 8. `asset_derivatives`

썸네일, 프리뷰, 트랜스코딩 결과.

주요 컬럼:

- `id uuid pk`
- `asset_file_id uuid not null fk`
- `derivative_type varchar(32) not null`
  - `THUMBNAIL`, `PREVIEW`, `TRANSCODED`, `WAVEFORM`
- `storage_bucket varchar(120) not null`
- `storage_key varchar(500) not null`
- `mime_type varchar(120) not null`
- `size_bytes bigint not null`
- `width integer null`
- `height integer null`
- `duration_ms bigint null`
- `created_at timestamp not null`

핵심 역할:

- 목록 썸네일
- 상세 미리보기
- 브라우저 호환 변환본

### E. Upload Session

#### 9. `upload_sessions`

멀티 파일 업로드와 direct upload 제어용.

주요 컬럼:

- `id uuid pk`
- `asset_id uuid not null fk`
- `asset_version_id uuid not null fk`
- `asset_file_id uuid not null fk`
- `issued_to_email varchar(255) not null`
- `presigned_method varchar(16) not null`
- `presigned_expires_at timestamp not null`
- `expected_size_bytes bigint null`
- `expected_sha256 varchar(64) null`
- `status varchar(32) not null`
  - `ISSUED`, `COMPLETED`, `EXPIRED`, `ABORTED`
- `created_at timestamp not null`

핵심 역할:

- 여러 파일 병렬 업로드
- 프론트 direct upload
- 업로드 완료 후 검증

### F. Tagging And Search

태깅은 검색 핵심 기능이므로 별도 정규화가 필요하다.

#### 10. `tags`

주요 컬럼:

- `id bigserial pk`
- `tag_key varchar(120) not null unique`
  - 정규화된 검색 키
- `display_name varchar(120) not null`
- `tag_type varchar(32) not null`
  - `CHARACTER`, `BACKGROUND`, `STYLE`, `OBJECT`, `LEVEL`, `FREEFORM`, `SYSTEM`
- `created_by_email varchar(255) null`
- `created_at timestamp not null`

예:

- `한복`
- `토니`
- `축제`
- `한국 전통`

#### 11. `tag_aliases`

동의어/오탈자/다른 표기 대응.

주요 컬럼:

- `id bigserial pk`
- `tag_id bigint not null fk`
- `alias varchar(120) not null`
- `normalized_alias varchar(120) not null unique`
- `created_at timestamp not null`

예:

- `토니`
- `tTony`
- `hanbok`
- `한복의상`

#### 12. `asset_tags`

현재 자산에 붙어 있는 확정 태그.

주요 컬럼:

- `asset_id uuid not null fk`
- `tag_id bigint not null fk`
- `tag_source varchar(32) not null`
  - `USER`, `AUTO_FILENAME`, `AUTO_EXTENSION`, `AUTO_METADATA`, `AUTO_AI`
- `confidence numeric(5,4) null`
- `is_primary boolean not null default false`
- `created_by_email varchar(255) null`
- `created_at timestamp not null`

제약:

- `primary key(asset_id, tag_id)`

핵심 역할:

- 검색
- 필터
- 목록 표시

#### 13. `asset_tag_suggestions`

자동 제안 태그. 아직 확정되지 않은 후보.

주요 컬럼:

- `id bigserial pk`
- `asset_id uuid not null fk`
- `suggested_tag_text varchar(120) not null`
- `matched_tag_id bigint null fk`
- `suggestion_source varchar(32) not null`
  - `FILENAME_RULE`, `EXTENSION_RULE`, `METADATA_RULE`, `AI_MODEL`
- `confidence numeric(5,4) not null`
- `decision_status varchar(32) not null`
  - `PENDING`, `ACCEPTED`, `REJECTED`
- `decided_by_email varchar(255) null`
- `decided_at timestamp null`
- `created_at timestamp not null`

핵심 역할:

- 파일명 패턴 기반 자동 태깅 제안
- 사용자의 수락/거절 흐름 지원

### G. External Origin And Migration

#### 14. `asset_origins`

외부 자산의 생성 루트 기록.

주요 컬럼:

- `id uuid pk`
- `origin_type varchar(32) not null`
  - `ACTS_AI`, `OUTSOURCED`, `SHOOT_RAW`, `EXISTING_LIBRARY`, `OTHER_TOOL`, `MIGRATION_IMPORT`, `OTHER`
- `origin_label varchar(120) not null`
- `origin_detail text null`
- `tool_name varchar(120) null`
- `source_url varchar(500) null`
- `created_by_email varchar(255) not null`
- `created_at timestamp not null`

요구사항 대응:

- 외부 생성 콘텐츠 등록 시 생성 루트 입력
- 생성 루트 검색
- 목록/상세에 외부 등록 여부 표시

#### 15. `migration_batches`

초기 마이그레이션 배치 단위 기록.

주요 컬럼:

- `id uuid pk`
- `batch_name varchar(120) not null`
- `source_system varchar(120) not null`
- `created_by_email varchar(255) not null`
- `notes text null`
- `created_at timestamp not null`

#### 16. `asset_links`

중복 연결, 버전 연결, 마이그레이션 매칭을 표현.

주요 컬럼:

- `id uuid pk`
- `source_asset_id uuid not null fk`
- `target_asset_id uuid not null fk`
- `relation_type varchar(32) not null`
  - `DUPLICATE_OF`, `VERSION_OF`, `MIGRATION_MATCH`, `DERIVED_FROM`
- `confidence numeric(5,4) null`
- `created_by_email varchar(255) not null`
- `created_at timestamp not null`

핵심 역할:

- 1차 마이그레이션 이후 누락 업로드 연결
- 동일 자산 판별 보정
- 별도 자산 vs 새 버전 선택 결과 저장

#### 17. `duplicate_candidates`

중복 탐지 결과를 보존.

주요 컬럼:

- `id bigserial pk`
- `asset_file_id uuid not null fk`
- `candidate_asset_id uuid not null fk`
- `match_type varchar(32) not null`
  - `EXACT_SHA256`, `PERCEPTUAL_HASH`, `FILENAME_SIMILAR`
- `score numeric(5,4) not null`
- `decision_status varchar(32) not null`
  - `PENDING`, `NEW_VERSION`, `SEPARATE_ASSET`, `IGNORED`
- `decided_by_email varchar(255) null`
- `decided_at timestamp null`
- `created_at timestamp not null`

### H. Folders And Favorites

#### 18. `asset_folders`

개인/팀 폴더 지원.

주요 컬럼:

- `id uuid pk`
- `folder_scope varchar(32) not null`
  - `PERSONAL`, `ORGANIZATION`
- `name varchar(120) not null`
- `owner_email varchar(255) null`
- `organization_id bigint null`
- `parent_folder_id uuid null fk`
- `created_at timestamp not null`

#### 19. `asset_folder_items`

주요 컬럼:

- `folder_id uuid not null fk`
- `asset_id uuid not null fk`
- `added_by_email varchar(255) not null`
- `created_at timestamp not null`

제약:

- `primary key(folder_id, asset_id)`

#### 20. `asset_favorites`

주요 컬럼:

- `user_email varchar(255) not null`
- `asset_id uuid not null fk`
- `created_at timestamp not null`

제약:

- `primary key(user_email, asset_id)`

### I. Retention And Deletion Policy

#### 21. `asset_retention_policies`

저장/삭제 정책 정의.

주요 컬럼:

- `id uuid pk`
- `policy_scope varchar(32) not null`
  - `GLOBAL`, `ORGANIZATION`, `ASSET_TYPE`
- `organization_id bigint null`
- `asset_type varchar(32) null`
- `trash_retention_days integer not null`
- `allow_restore boolean not null`
- `allow_hard_delete boolean not null`
- `updated_by_email varchar(255) not null`
- `created_at timestamp not null`
- `updated_at timestamp not null`

#### 22. `asset_lifecycle_actions`

삭제/복구 이력.

주요 컬럼:

- `id bigserial pk`
- `asset_id uuid not null fk`
- `action_type varchar(32) not null`
  - `TRASHED`, `RESTORED`, `PURGED`
- `actor_email varchar(255) not null`
- `policy_id uuid null fk`
- `detail text null`
- `created_at timestamp not null`

## Type-Specific Metadata Strategy

유형별 필드는 한 테이블에 다 몰지 않는다.

권장 방식:

- 공통 필드: `assets`, `asset_versions`, `asset_files`
- 유형별 세부 필드: 별도 extension table

추천 확장 테이블:

- `asset_image_metadata`
  - `asset_file_id pk`, `color_space`, `dpi`, `has_transparency`
- `asset_audio_metadata`
  - `asset_file_id pk`, `codec`, `channels`, `lufs`
- `asset_video_metadata`
  - `asset_file_id pk`, `codec`, `frame_rate`, `aspect_ratio`
- `asset_text_metadata`
  - `asset_version_id pk`, `text_format`, `language_code`, `char_count`
- `asset_document_metadata`
  - `asset_file_id pk`, `page_count`, `document_type`

이렇게 하면 요구사항 4.4를 만족하면서도 스키마가 무너지지 않는다.

## Search Design For `한복 토니`

가장 중요한 검색 기준은 태그다.

검색 인풋 `한복 토니`가 들어오면 우선 아래를 대상으로 검색한다.

1. `asset_tags`
2. `tag_aliases`
3. `assets.title`
4. `assets.description`
5. `assets.search_text`
6. `asset_files.original_filename`
7. `asset_origins.origin_label`

권장 인덱스:

- `gin (search_text gin_trgm_ops)` on `assets`
- `btree (organization_id, created_at desc)` on `assets`
- `btree (owner_user_email, created_at desc)` on `assets`
- `btree (asset_type, status)` on `assets`
- `btree (tag_id, asset_id)` on `asset_tags`
- `btree (normalized_alias)` on `tag_aliases`
- `btree (sha256)` on `asset_files`
- `btree (perceptual_hash)` on `asset_files`

## Required Metadata For External Upload

외부 업로드 시 최소 입력값:

- `asset_type`
- `title`
- `origin_type`
- `origin_label` 또는 `origin_detail`
- `organization_id`
- `story_relation_type`

권장 추가 입력:

- `description`
- `characters` 관련 태그
- `background` 관련 태그
- 자유 태그
- `declared_format`

필수 제외:

- 저작권 상태
- 사용 권한 상태
- 공개 범위 상세값

## Must-Have Tables For First Implementation

1차 구현 최소 범위:

- `assets`
- `asset_versions`
- `asset_files`
- `asset_file_media_metadata`
- `upload_sessions`
- `tags`
- `asset_tags`
- `asset_tag_suggestions`
- `asset_origins`
- `asset_events`

이 정도면 아래 요구를 커버할 수 있다.

- 멀티 업로드
- 자동 태그 제안
- 파일 메타데이터 추출
- 제작자/조직 자동 기록
- 외부 업로드 생성 루트 기록
- 기본 버전 관리
- 기본 이력 표시

## Should Come Next

2차 구현 권장 순서:

1. `duplicate_candidates`
2. `asset_links`
3. `asset_derivatives`
4. `asset_folders`
5. `asset_favorites`
6. `asset_retention_policies`
7. `asset_lifecycle_actions`

## Naming Recommendation

코드에서는 `content`와 `asset`을 섞지 말고 일단 `asset`으로 통일하는 편이 낫다.

이유:

- 업로드/파일/미디어 중심 기능과 잘 맞는다
- 외부 자산, AI 생성 결과, 내부 제작물을 같은 모델에 넣기 쉽다
- 이후 시나리오 같은 text-first 도메인이 커지면 그때 `documents`를 별도 하위 모델로 분리하면 된다
